import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { createPortal } from "preact/compat";
import {
  COLOR_OPTIONS,
  closestCrossingShadow,
  deepElementFromPoint,
  clearPendingReload,
  clearSession,
  formatAnnotationMarkdown,
  generateOutput,
  getPageKey,
  hasPendingReload,
  identifyElement,
  isFrozen,
  loadAnnotations,
  loadSession,
  loadSettings,
  loadToolbarPos,
  originalSetTimeout,
  reconcileAnnotationPhases,
  resolveElementFromSelector,
  saveAnnotations,
  saveSession,
  saveSettings,
  saveToolbarPos,
  toggleFreeze,
  unfreezeAnimations,
  type Annotation,
  type BoundingBox,
  type CapturedAnnotationContext,
  type OverlaySettings,
  type SerializablePending,
} from "@comment-to-fix/core";
import { AnnotationMarker, PendingMarker } from "./components/AnnotationMarker";
import { AnnotationPopup, type AnnotationPopupHandle } from "./components/AnnotationPopup";
import { Toolbar } from "./components/Toolbar";
import {
  buildAnnotationFromContext,
  captureAnnotationContext,
  contextForEdit,
  fetchProcessedStatus,
  submitAnnotation,
} from "./api";

const DRAG_THRESHOLD = 8;
const TOOLBAR_SIZE = 48;
const TOOLBAR_MARGIN = 24;

function isValidToolbarPos(pos: { x: number; y: number }): boolean {
  return (
    pos.x >= 0 &&
    pos.y >= 0 &&
    pos.x <= window.innerWidth - TOOLBAR_SIZE &&
    pos.y <= window.innerHeight - TOOLBAR_SIZE
  );
}

function clampToolbarPos(
  x: number,
  y: number,
  size: { width: number; height: number },
): { x: number; y: number } {
  return {
    x: Math.min(Math.max(TOOLBAR_MARGIN, x), window.innerWidth - size.width - TOOLBAR_MARGIN),
    y: Math.min(Math.max(TOOLBAR_MARGIN, y), window.innerHeight - size.height - TOOLBAR_MARGIN),
  };
}

function measureToolbarWrap(wrap: HTMLElement): { width: number; height: number } {
  const controls = wrap.querySelector<HTMLElement>(".ctf-toolbar-controls");
  const toolbar = wrap.querySelector<HTMLElement>(".ctf-toolbar");
  if (!controls || !toolbar?.classList.contains("expanded")) {
    const rect = wrap.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  const prevMaxWidth = controls.style.maxWidth;
  controls.style.maxWidth = "none";
  const rect = wrap.getBoundingClientRect();
  controls.style.maxWidth = prevMaxWidth;
  return { width: rect.width, height: rect.height };
}

function fitToolbarToViewport(
  pos: { x: number; y: number },
  size: { width: number; height: number },
): { x: number; y: number } {
  const nearRight = pos.x + size.width / 2 >= window.innerWidth / 2;
  const nearBottom = pos.y + size.height / 2 >= window.innerHeight / 2;

  let x = pos.x;
  let y = pos.y;

  if (nearRight) {
    x = window.innerWidth - size.width - TOOLBAR_MARGIN;
  }
  if (nearBottom) {
    y = window.innerHeight - size.height - TOOLBAR_MARGIN;
  }

  return clampToolbarPos(x, y, size);
}

function refitToolbarPosition(
  wrap: HTMLElement,
  currentPos: { x: number; y: number } | null,
): { x: number; y: number } {
  const rect = wrap.getBoundingClientRect();
  const size = measureToolbarWrap(wrap);
  const base = currentPos ?? { x: rect.left, y: rect.top };
  return fitToolbarToViewport(base, size);
}

function isToolbarAnchorRight(pos: { x: number; y: number } | null): boolean {
  if (!pos) return true;
  return pos.x + TOOLBAR_SIZE / 2 >= window.innerWidth / 2;
}
const TEXT_TAGS = new Set([
  "P", "SPAN", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "TD", "TH", "LABEL",
  "BLOCKQUOTE", "A", "EM", "STRONG", "B", "I", "CODE", "PRE",
]);

type PendingAnnotation = {
  x: number;
  y: number;
  clientY: number;
  element: string;
  elementPath: string;
  selectedText?: string;
  boundingBox?: BoundingBox;
  isMultiSelect?: boolean;
  isFixed?: boolean;
  elementBoundingBoxes?: BoundingBox[];
  multiSelectElements?: HTMLElement[];
  targetElement?: HTMLElement;
  computedStyles?: string;
  computedStylesObj?: Record<string, string>;
  context: CapturedAnnotationContext;
};

type MultiItem = {
  element: HTMLElement;
  name: string;
  rect: DOMRect;
};

function isOverlayNode(node: EventTarget | null): boolean {
  if (!(node instanceof Element)) return false;
  return !!node.closest("[data-ctf-toolbar],[data-ctf-popup],[data-ctf-marker],[data-ctf-root],[data-ctf-settings],[data-ctf-history]");
}

function getAccentColor(settings: OverlaySettings, isMulti?: boolean): string {
  if (isMulti) return "var(--ctf-accent-green)";
  const c = COLOR_OPTIONS.find((o) => o.id === settings.annotationColorId);
  return c?.color ?? "#0088FF";
}

function injectColorTokens() {
  if (document.getElementById("ctf-color-tokens")) return;
  const style = document.createElement("style");
  style.id = "ctf-color-tokens";
  style.textContent = COLOR_OPTIONS.map(
    (c) => `[data-ctf-accent="${c.id}"] { --ctf-accent: ${c.color}; }`,
  ).join("\n");
  document.head.appendChild(style);
}

function popupStyle(markerX: number, markerY: number): Record<string, string | number> {
  const left = Math.max(160, Math.min(window.innerWidth - 160, (markerX / 100) * window.innerWidth));
  const style: Record<string, string | number> = { left };
  if (markerY > window.innerHeight - 290) {
    style.bottom = window.innerHeight - markerY + 20;
  } else {
    style.top = markerY + 20;
  }
  return style;
}

function toSerializablePending(p: PendingAnnotation): SerializablePending {
  return {
    x: p.x,
    y: p.y,
    clientY: p.clientY,
    element: p.element,
    elementPath: p.elementPath,
    selectedText: p.selectedText,
    boundingBox: p.boundingBox,
    isMultiSelect: p.isMultiSelect,
    isFixed: p.isFixed,
    elementBoundingBoxes: p.elementBoundingBoxes,
    computedStyles: p.computedStyles,
    computedStylesObj: p.computedStylesObj,
    context: p.context,
  };
}

function fromSerializablePending(s: SerializablePending): PendingAnnotation {
  const el = resolveElementFromSelector(s.context.selector);
  return { ...s, targetElement: el ?? undefined };
}

export function App() {
  const pageKey = getPageKey();
  const [active, setActive] = useState(false);
  const [settings, setSettings] = useState<OverlaySettings>(() => loadSettings());
  const [annotations, setAnnotations] = useState<Annotation[]>(() => loadAnnotations(pageKey));
  const [showMarkers, setShowMarkers] = useState(true);
  const [frozen, setFrozen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(() => {
    const saved = loadToolbarPos();
    return saved && isValidToolbarPos(saved) ? saved : null;
  });
  const toolbarPosRef = useRef(toolbarPos);
  useEffect(() => {
    toolbarPosRef.current = toolbarPos;
  }, [toolbarPos]);
  const [scrollY, setScrollY] = useState(0);

  const [hoverInfo, setHoverInfo] = useState<{ name: string; x: number; y: number } | null>(null);
  const [highlight, setHighlight] = useState<{ rect: DOMRect; multi?: boolean } | null>(null);
  const [pending, setPending] = useState<PendingAnnotation | null>(null);
  const [pendingExiting, setPendingExiting] = useState(false);
  const [editing, setEditing] = useState<Annotation | null>(null);
  const [editExiting, setEditExiting] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [isClearing, setIsClearing] = useState(false);

  const [multiPending, setMultiPending] = useState<MultiItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragRect, setDragRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [selectionChip, setSelectionChip] = useState<{ x: number; y: number; text: string; element: Element } | null>(null);
  const [pendingDraft, setPendingDraft] = useState("");
  const [editDraft, setEditDraft] = useState("");

  const popupRef = useRef<AnnotationPopupHandle>(null);
  const editPopupRef = useRef<AnnotationPopupHandle>(null);
  const mouseDownRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const modifiersRef = useRef({ cmd: false, shift: false });
  const justFinishedDragRef = useRef(false);
  const sessionRestoredRef = useRef(false);
  const pendingToastAtRef = useRef(0);
  const sessionSaveTimerRef = useRef<ReturnType<typeof originalSetTimeout> | null>(null);

  useEffect(() => {
    injectColorTokens();
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (sessionRestoredRef.current) return;
    sessionRestoredRef.current = true;

    const session = loadSession(pageKey);
    if (!session?.active) return;

    originalSetTimeout(() => {
      window.scrollTo(0, session.scrollY);
      setScrollY(session.scrollY);
      setActive(true);

      if (session.draft?.kind === "pending" && session.draft.pending) {
        const el = resolveElementFromSelector(session.draft.pending.context.selector);
        if (el) {
          setPending(fromSerializablePending(session.draft.pending));
          setPendingDraft(session.draft.text);
        } else if (session.draft.text) {
          setToast("Page changed — your draft is saved, click the element again");
          setPendingDraft(session.draft.text);
        }
      } else if (session.draft?.kind === "edit" && session.draft.editingId) {
        const ann = loadAnnotations(pageKey).find((a) => a.id === session.draft!.editingId);
        if (ann) {
          setEditing(ann);
          setEditDraft(session.draft.text);
        }
      }
    }, 0);
  }, [pageKey]);

  useEffect(() => {
    saveAnnotations(pageKey, annotations);
  }, [annotations, pageKey]);

  useEffect(() => {
    saveSettings(settings);
    document.documentElement.setAttribute("data-ctf-accent", settings.annotationColorId);
  }, [settings]);

  useEffect(() => {
    if (active && !pending && !editing) {
      document.documentElement.setAttribute("data-ctf-active", "");
    } else {
      document.documentElement.removeAttribute("data-ctf-active");
    }
    if (pending || editing) {
      document.documentElement.setAttribute("data-ctf-popover", "");
    } else {
      document.documentElement.removeAttribute("data-ctf-popover");
    }
    if (active) {
      document.documentElement.setAttribute("data-ctf-feedback", "");
    } else {
      document.documentElement.removeAttribute("data-ctf-feedback");
    }
    return () => {
      document.documentElement.removeAttribute("data-ctf-active");
      document.documentElement.removeAttribute("data-ctf-popover");
      document.documentElement.removeAttribute("data-ctf-feedback");
    };
  }, [active, pending, editing]);

  const showToast = (msg: string, ms = 1800) => {
    setToast(msg);
    originalSetTimeout(() => setToast(null), ms);
  };

  const persistSession = useCallback(() => {
    if (!active) {
      clearSession(pageKey);
      return;
    }
    saveSession(pageKey, {
      scrollY: window.scrollY,
      active,
      draft: pending
        ? { kind: "pending", text: pendingDraft, pending: toSerializablePending(pending) }
        : editing
          ? { kind: "edit", text: editDraft, editingId: editing.id }
          : undefined,
    });
  }, [active, pending, editing, pendingDraft, editDraft, pageKey]);

  useEffect(() => {
    if (sessionSaveTimerRef.current) clearTimeout(sessionSaveTimerRef.current);
    sessionSaveTimerRef.current = originalSetTimeout(persistSession, 300);
    return () => {
      if (sessionSaveTimerRef.current) clearTimeout(sessionSaveTimerRef.current);
    };
  }, [persistSession]);

  useEffect(() => {
    const onBeforeUnload = () => persistSession();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [persistSession]);

  useEffect(() => {
    const notify = () => {
      if (!document.documentElement.hasAttribute("data-ctf-feedback")) return;
      const now = Date.now();
      if (now - pendingToastAtRef.current < 2000) return;
      pendingToastAtRef.current = now;
      showToast("Page updated — press Esc when ready to apply", 3000);
    };
    window.addEventListener("ctf-pending-reload", notify);
    return () => window.removeEventListener("ctf-pending-reload", notify);
  }, []);

  const syncProcessedStatus = useCallback(async (processedIds?: string[]) => {
    let ids = processedIds;
    if (!ids) {
      const status = await fetchProcessedStatus();
      if (!status) return;
      ids = status.processedIds;
    }
    setAnnotations((prev) => reconcileAnnotationPhases(prev, ids!));
  }, []);

  useEffect(() => {
    if (!annotations.some((a) => a.status === "sent")) return;
    void syncProcessedStatus();
  }, [annotations.length, syncProcessedStatus]);

  useEffect(() => {
    const onProcessed = (e: Event) => {
      const detail = (e as CustomEvent<{ processedIds?: string[] }>).detail;
      if (detail?.processedIds) {
        setAnnotations((prev) => reconcileAnnotationPhases(prev, detail.processedIds!));
      } else {
        void syncProcessedStatus();
      }
    };
    window.addEventListener("ctf-processed", onProcessed);
    return () => window.removeEventListener("ctf-processed", onProcessed);
  }, [syncProcessedStatus]);

  useEffect(() => {
    const hasFixing = annotations.some((a) => a.phase === "fixing");
    if (!hasFixing) return;
    const interval = setInterval(() => {
      void syncProcessedStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [annotations, syncProcessedStatus]);

  useEffect(() => {
    if (!focusedId) return;
    const timer = originalSetTimeout(() => setFocusedId(null), 2000);
    return () => clearTimeout(timer);
  }, [focusedId]);

  const applyToolbarPos = useCallback((pos: { x: number; y: number }) => {
    toolbarPosRef.current = pos;
    setToolbarPos(pos);
    saveToolbarPos(pos.x, pos.y);
  }, []);

  useLayoutEffect(() => {
    if (!active) return;

    const wrap = document.querySelector<HTMLElement>("[data-ctf-toolbar]");
    if (!wrap) return;

    const sync = () => {
      const next = refitToolbarPosition(wrap, toolbarPosRef.current);
      const current = toolbarPosRef.current;
      if (!current || current.x !== next.x || current.y !== next.y) {
        applyToolbarPos(next);
      }
    };

    sync();
    const raf = requestAnimationFrame(sync);
    const controls = wrap.querySelector<HTMLElement>(".ctf-toolbar-controls");
    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.propertyName === "max-width") sync();
    };
    controls?.addEventListener("transitionend", onTransitionEnd);

    return () => {
      cancelAnimationFrame(raf);
      controls?.removeEventListener("transitionend", onTransitionEnd);
    };
  }, [active, applyToolbarPos]);

  useEffect(() => {
    if (!active || !toolbarPos) return;

    const onResize = () => {
      const wrap = document.querySelector<HTMLElement>("[data-ctf-toolbar]");
      if (!wrap) return;
      applyToolbarPos(refitToolbarPosition(wrap, toolbarPosRef.current));
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active, toolbarPos, applyToolbarPos]);

  const deactivate = useCallback(() => {
    if (hasPendingReload()) {
      clearPendingReload();
      clearSession(pageKey);
      location.reload();
      return;
    }
    clearSession(pageKey);
    setPendingDraft("");
    setEditDraft("");
    setActive(false);
    setPending(null);
    setEditing(null);
    setShowSettings(false);
    setMultiPending([]);
    setHighlight(null);
    setHoverInfo(null);
    if (isFrozen()) {
      unfreezeAnimations();
      setFrozen(false);
    }
  }, [pageKey]);

  const createMultiPending = useCallback((items: MultiItem[]) => {
    if (items.length === 0) return;
    setPendingDraft("");
    const first = items[0]!;
    const ctx = captureAnnotationContext(first.element);

    if (items.length === 1) {
      const rect = first.rect;
      setPending({
        x: (rect.left + rect.width / 2) / window.innerWidth * 100,
        y: ctx.isFixed ? rect.top + 12 : rect.top + window.scrollY + 12,
        clientY: rect.top,
        element: first.name,
        elementPath: ctx.elementPath,
        boundingBox: {
          x: rect.left,
          y: ctx.isFixed ? rect.top : rect.top + window.scrollY,
          width: rect.width,
          height: rect.height,
        },
        isFixed: ctx.isFixed,
        targetElement: first.element,
        computedStyles: ctx.computedStyles,
        computedStylesObj: ctx.computedStylesObj,
        context: ctx,
      });
    } else {
      const rects = items.map((i) => i.element.getBoundingClientRect());
      const bounds = {
        left: Math.min(...rects.map((r) => r.left)),
        top: Math.min(...rects.map((r) => r.top)),
        right: Math.max(...rects.map((r) => r.right)),
        bottom: Math.max(...rects.map((r) => r.bottom)),
      };
      const last = items[items.length - 1]!;
      const lastRect = last.element.getBoundingClientRect();
      const lastCtx = captureAnnotationContext(last.element);
      const names = items.slice(0, 5).map((i) => i.name).join(", ");
      const suffix = items.length > 5 ? ` +${items.length - 5} more` : "";

      setPending({
        x: (lastRect.left + lastRect.width / 2) / window.innerWidth * 100,
        y: lastCtx.isFixed ? lastRect.top + 12 : lastRect.top + window.scrollY + 12,
        clientY: lastRect.top,
        element: `${items.length} elements: ${names}${suffix}`,
        elementPath: "multi-select",
        isMultiSelect: true,
        isFixed: lastCtx.isFixed,
        boundingBox: {
          x: bounds.left,
          y: bounds.top + window.scrollY,
          width: bounds.right - bounds.left,
          height: bounds.bottom - bounds.top,
        },
        elementBoundingBoxes: rects.map((r) => ({
          x: r.left,
          y: r.top + window.scrollY,
          width: r.width,
          height: r.height,
        })),
        multiSelectElements: items.map((i) => i.element),
        targetElement: last.element,
        computedStyles: ctx.computedStyles,
        computedStylesObj: ctx.computedStylesObj,
        context: { ...ctx, element: `${items.length} elements: ${names}${suffix}` },
      });
    }
    setHighlight(null);
    setHoverInfo(null);
  }, []);

  const cancelPending = useCallback(() => {
    setPendingExiting(true);
    originalSetTimeout(() => {
      setPending(null);
      setPendingExiting(false);
      setPendingDraft("");
    }, 150);
  }, []);

  const addAnnotation = useCallback(
    async (comment: string, pendingAnn: PendingAnnotation, editId?: string) => {
      const marker = { x: pendingAnn.x, y: pendingAnn.y };
      let ann = buildAnnotationFromContext(comment, pendingAnn.context, marker, {
        selectedText: pendingAnn.selectedText ?? pendingAnn.context.selectedText ?? undefined,
        isMultiSelect: pendingAnn.isMultiSelect,
        isFixed: pendingAnn.isFixed,
        elementBoundingBoxes: pendingAnn.elementBoundingBoxes,
        boundingBox: pendingAnn.boundingBox,
        computedStyles: pendingAnn.computedStyles,
      });

      if (editId) {
        const existing = annotations.find((a) => a.id === editId);
        if (!existing) return;
        const updated: Annotation = {
          ...existing,
          comment,
          markdown: formatAnnotationMarkdown({ ...existing, comment }),
          timestamp: Date.now(),
        };
        try {
          await submitAnnotation(updated);
          setAnnotations((prev) => prev.map((a) => (a.id === editId ? updated : a)));
          setEditExiting(true);
          originalSetTimeout(() => {
            setEditing(null);
            setEditExiting(false);
            setEditDraft("");
          }, 150);
          showToast("Comment updated");
        } catch (err) {
          showToast(err instanceof Error ? err.message : "Failed to update", 2200);
        }
        return;
      }

      try {
        const sent = await submitAnnotation(ann);
        const withPhase: Annotation = { ...sent, status: "sent", phase: "fixing" };
        setAnnotations((prev) => [...prev, withPhase]);
        setPendingExiting(true);
        originalSetTimeout(() => {
          setPending(null);
          setPendingExiting(false);
          setPendingDraft("");
        }, 150);
        window.getSelection()?.removeAllRanges();
        showToast("Comment sent");
        if (settings.autoClearAfterSend) {
          originalSetTimeout(() => {
            setAnnotations((prev) => prev.filter((a) => a.id !== sent.id));
          }, 500);
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to send", 2200);
      }
    },
    [settings.autoClearAfterSend, annotations],
  );

  const deleteAnnotation = useCallback((id: string) => {
    setExitingIds((prev) => new Set(prev).add(id));
    if (editing?.id === id) {
      setEditExiting(true);
      originalSetTimeout(() => {
        setEditing(null);
        setEditExiting(false);
      }, 150);
    }
    originalSetTimeout(() => {
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
      setExitingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 150);
  }, [editing]);

  const dismissAnnotation = useCallback((id: string) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, phase: "dismissed" as const } : a)),
    );
  }, []);

  const restoreAnnotation = useCallback((id: string) => {
    setAnnotations((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const { phase: _phase, ...rest } = a;
        return rest as Annotation;
      }),
    );
    void syncProcessedStatus();
  }, [syncProcessedStatus]);

  const applyReadyFixes = useCallback(() => {
    setAnnotations((prev) =>
      prev.map((a) => (a.phase === "ready" ? { ...a, phase: "dismissed" as const } : a)),
    );
    clearPendingReload();
    showToast("Reloading to show fixes…");
    originalSetTimeout(() => location.reload(), 150);
  }, []);

  const jumpToAnnotation = useCallback((id: string) => {
    const ann = annotations.find((a) => a.id === id);
    if (!ann) return;

    if (!active) setActive(true);
    setShowMarkers(true);
    setShowHistory(false);
    setFocusedId(id);
    setHoveredId(id);

    const el = resolveElementFromSelector(ann.selector);
    if (el?.isConnected) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (!ann.isFixed && ann.y != null) {
      window.scrollTo({
        top: Math.max(0, ann.y - window.innerHeight / 3),
        behavior: "smooth",
      });
    }
  }, [active, annotations]);

  const copyOutput = useCallback(async () => {
    const output = generateOutput(annotations, pageKey, settings.outputDetail);
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
    } catch {
      // continue
    }
    setCopied(true);
    originalSetTimeout(() => setCopied(false), 2000);
    showToast("Copied to clipboard");
    if (settings.autoClearAfterCopy) {
      originalSetTimeout(() => setAnnotations([]), 500);
    }
  }, [annotations, pageKey, settings]);

  const clearAll = useCallback(() => {
    if (annotations.length === 0) return;
    setIsClearing(true);
    originalSetTimeout(() => {
      setAnnotations([]);
      setIsClearing(false);
    }, annotations.length * 30 + 200);
  }, [annotations.length]);

  // Document event handlers
  useEffect(() => {
    if (!active) return;

    const onMove = (e: MouseEvent) => {
      if (pending || editing) {
        setHighlight(null);
        return;
      }
      const el = deepElementFromPoint(e.clientX, e.clientY);
      if (!el || isOverlayNode(el)) {
        setHoverInfo(null);
        setHighlight(null);
        return;
      }
      const { name } = identifyElement(el);
      setHoverInfo({ name, x: e.clientX, y: e.clientY });
      setHighlight({ rect: el.getBoundingClientRect(), multi: multiPending.length > 0 });
    };

    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, [active, pending, editing, multiPending.length]);

  useEffect(() => {
    if (!active) return;

    const onClick = (e: MouseEvent) => {
      if (justFinishedDragRef.current) {
        justFinishedDragRef.current = false;
        return;
      }
      const target = (e.composedPath()[0] ?? e.target) as HTMLElement;
      if (isOverlayNode(target)) return;

      if (e.metaKey && e.shiftKey && !pending && !editing) {
        e.preventDefault();
        e.stopPropagation();
        const el = deepElementFromPoint(e.clientX, e.clientY);
        if (!el) return;
        const { name } = identifyElement(el);
        setMultiPending((prev) => {
          const idx = prev.findIndex((p) => p.element === el);
          if (idx >= 0) return prev.filter((_, i) => i !== idx);
          return [...prev, { element: el, name, rect: el.getBoundingClientRect() }];
        });
        return;
      }

      if (pending) {
        e.preventDefault();
        popupRef.current?.shake();
        return;
      }
      if (editing) {
        e.preventDefault();
        editPopupRef.current?.shake();
        return;
      }

      const el = deepElementFromPoint(e.clientX, e.clientY);
      if (!el) return;

      const isInteractive = closestCrossingShadow(el, "button, a, input, select, textarea, [role='button']");
      if (settings.blockInteractions && isInteractive) {
        e.preventDefault();
        e.stopPropagation();
      }

      e.preventDefault();
      const ctx = captureAnnotationContext(el, window.getSelection()?.toString().trim() || null);
      const x = (e.clientX / window.innerWidth) * 100;
      const y = ctx.isFixed ? e.clientY : e.clientY + window.scrollY;

      setPendingDraft("");
      setPending({
        x,
        y: y + 12,
        clientY: e.clientY,
        element: ctx.element,
        elementPath: ctx.elementPath,
        selectedText: ctx.selectedText ?? undefined,
        boundingBox: ctx.boundingBox ?? undefined,
        isFixed: ctx.isFixed,
        targetElement: el,
        computedStyles: ctx.computedStyles,
        computedStylesObj: ctx.computedStylesObj,
        context: ctx,
      });
      setHoverInfo(null);
      setSelectionChip(null);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [active, pending, editing, settings.blockInteractions]);

  useEffect(() => {
    if (!active) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Meta") modifiersRef.current.cmd = true;
      if (e.key === "Shift") modifiersRef.current.shift = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const wasBoth = modifiersRef.current.cmd && modifiersRef.current.shift;
      if (e.key === "Meta") modifiersRef.current.cmd = false;
      if (e.key === "Shift") modifiersRef.current.shift = false;
      const nowBoth = modifiersRef.current.cmd && modifiersRef.current.shift;
      if (wasBoth && !nowBoth && multiPending.length > 0) {
        createMultiPending(multiPending);
        setMultiPending([]);
      }
    };
    const onBlur = () => {
      modifiersRef.current = { cmd: false, shift: false };
      setMultiPending([]);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [active, multiPending, createMultiPending]);

  useEffect(() => {
    if (!active || pending) return;

    const onMouseDown = (e: MouseEvent) => {
      const target = (e.composedPath()[0] ?? e.target) as HTMLElement;
      if (isOverlayNode(target)) return;
      if (TEXT_TAGS.has(target.tagName) || target.isContentEditable) return;
      e.preventDefault();
      mouseDownRef.current = { x: e.clientX, y: e.clientY };
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [active, pending]);

  useEffect(() => {
    if (!active || pending) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!mouseDownRef.current) return;
      const dx = e.clientX - mouseDownRef.current.x;
      const dy = e.clientY - mouseDownRef.current.y;
      if (!isDragging && dx * dx + dy * dy >= DRAG_THRESHOLD * DRAG_THRESHOLD) {
        dragStartRef.current = mouseDownRef.current;
        setIsDragging(true);
      }
      if (isDragging && dragStartRef.current) {
        const left = Math.min(dragStartRef.current.x, e.clientX);
        const top = Math.min(dragStartRef.current.y, e.clientY);
        setDragRect({
          left,
          top,
          width: Math.abs(e.clientX - dragStartRef.current.x),
          height: Math.abs(e.clientY - dragStartRef.current.y),
        });
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!mouseDownRef.current) return;
      const wasDragging = isDragging;
      if (wasDragging && dragStartRef.current) {
        const left = Math.min(dragStartRef.current.x, e.clientX);
        const top = Math.min(dragStartRef.current.y, e.clientY);
        const right = Math.max(dragStartRef.current.x, e.clientX);
        const bottom = Math.max(dragStartRef.current.y, e.clientY);
        const width = right - left;
        const height = bottom - top;

        const found = new Set<HTMLElement>();
        const points = [
          [left, top], [right, top], [left, bottom], [right, bottom],
          [(left + right) / 2, (top + bottom) / 2],
        ] as const;
        for (const [px, py] of points) {
          const el = deepElementFromPoint(px, py);
          if (el && !isOverlayNode(el)) found.add(el);
        }

        const elements = Array.from(found).map((el) => ({
          element: el,
          name: identifyElement(el).name,
          rect: el.getBoundingClientRect(),
        }));

        if (elements.length > 0) {
          createMultiPending(elements);
        } else if (width > 20 && height > 20) {
          const x = ((left + right) / 2 / window.innerWidth) * 100;
          const y = top + window.scrollY + 12;
          const ctx = captureAnnotationContext(document.body);
          setPendingDraft("");
          setPending({
            x,
            y,
            clientY: top,
            element: "Area selection",
            elementPath: `region at (${Math.round(left)}, ${Math.round(top)})`,
            isMultiSelect: true,
            boundingBox: { x: left, y: top + window.scrollY, width, height },
            computedStylesObj: {},
            context: { ...ctx, element: "Area selection" },
          });
        }
        justFinishedDragRef.current = true;
      }
      mouseDownRef.current = null;
      dragStartRef.current = null;
      setIsDragging(false);
      setDragRect(null);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [active, pending, isDragging, createMultiPending]);

  useEffect(() => {
    if (!active) return;
    const onMouseUp = () => {
      if (pending || editing) return;
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      if (!text || text.length < 2) {
        setSelectionChip(null);
        return;
      }
      const range = sel?.rangeCount ? sel.getRangeAt(0) : null;
      const rect = range?.getBoundingClientRect();
      if (!rect) return;
      const anchor = range?.commonAncestorContainer;
      const element = anchor instanceof Element ? anchor : anchor?.parentElement ?? document.body;
      setSelectionChip({ x: rect.left + rect.width / 2, y: rect.top, text, element });
    };
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, [active, pending, editing]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;

      if (e.key === "Escape") {
        if (pending) cancelPending();
        else if (editing) {
          setEditExiting(true);
          originalSetTimeout(() => {
            setEditing(null);
            setEditExiting(false);
          }, 150);
        } else if (active) deactivate();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        setActive((v) => !v);
        return;
      }

      if (!active || isTyping || e.metaKey || e.ctrlKey) return;

      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        setFrozen(toggleFreeze());
      }
      if ((e.key === "h" || e.key === "H") && annotations.length > 0) {
        e.preventDefault();
        setShowMarkers((v) => !v);
      }
      if ((e.key === "l" || e.key === "L") && annotations.length > 0) {
        e.preventDefault();
        setShowSettings(false);
        setShowHistory((v) => !v);
      }
      if (e.key === "c" || e.key === "C") {
        if (annotations.length > 0) {
          e.preventDefault();
          void copyOutput();
        }
      }
      if (e.key === "x" || e.key === "X") {
        if (annotations.length > 0) {
          e.preventDefault();
          clearAll();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, pending, editing, annotations.length, cancelPending, deactivate, copyOutput, clearAll]);

  const onToolbarDragStart = useCallback((e: PointerEvent, collapsed: boolean) => {
    const target = e.target as HTMLElement;
    if (!collapsed && target.closest("button") && !target.closest(".ctf-toolbar-controls")) return;

    const wrap = (e.currentTarget as HTMLElement).closest(".ctf-toolbar-wrap") as HTMLElement;
    const rect = wrap.getBoundingClientRect();
    let moved = false;
    let offsetX = e.clientX - rect.left;
    let offsetY = e.clientY - rect.top;
    const startX = e.clientX;
    const startY = e.clientY;

    const onMove = (ev: PointerEvent) => {
      if (!moved) {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        moved = true;
        if (!toolbarPosRef.current) {
          const anchored = { x: rect.left, y: rect.top };
          toolbarPosRef.current = anchored;
          setToolbarPos(anchored);
          offsetX = ev.clientX - rect.left;
          offsetY = ev.clientY - rect.top;
        }
      }
      const rawX = ev.clientX - offsetX;
      const rawY = ev.clientY - offsetY;
      const bounds = wrap.getBoundingClientRect();
      const clamped = clampToolbarPos(rawX, rawY, {
        width: bounds.width,
        height: bounds.height,
      });
      toolbarPosRef.current = clamped;
      setToolbarPos(clamped);
    };
    const onUp = () => {
      if (collapsed && !moved) {
        const rect = wrap.getBoundingClientRect();
        if (!toolbarPosRef.current) {
          applyToolbarPos({ x: rect.left, y: rect.top });
        }
        setActive(true);
      }
      if (moved && toolbarPosRef.current) {
        saveToolbarPos(toolbarPosRef.current.x, toolbarPosRef.current.y);
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [applyToolbarPos]);

  const renderOutline = (
    box: BoundingBox,
    multi?: boolean,
    fixed?: boolean,
  ) => (
    <div
      className={`ctf-highlight ${multi ? "multi" : ""}`}
      style={{
        left: box.x,
        top: fixed ? box.y : box.y - scrollY,
        width: box.width,
        height: box.height,
      }}
    />
  );

  const visible = annotations.filter((a) => !exitingIds.has(a.id) && a.phase !== "dismissed");
  const fixedAnns = visible.filter((a) => a.isFixed);
  const scrollAnns = visible.filter((a) => !a.isFixed);
  const highlightId = hoveredId ?? focusedId;
  const hoveredAnnotation = highlightId ? annotations.find((a) => a.id === highlightId) : null;

  const root = (
    <div
      className={`ctf-layer ${settings.dark ? "" : "light"}`}
      data-ctf-root
      data-ctf-accent={settings.annotationColorId}
    >
      <style>{__CTF_STYLES__}</style>

      {active && highlight && !pending && !isDragging && renderOutline(
        {
          x: highlight.rect.left,
          y: highlight.rect.top + scrollY,
          width: highlight.rect.width,
          height: highlight.rect.height,
        },
        highlight.multi || multiPending.length > 0,
      )}

      {active && multiPending.map((item, i) => {
        const r = item.element.getBoundingClientRect();
        return renderOutline(
          { x: r.left, y: r.top + scrollY, width: r.width, height: r.height },
          true,
        );
      })}

      {active && isDragging && dragRect && (
        <div
          className="ctf-drag-rect"
          style={{
            left: dragRect.left,
            top: dragRect.top,
            width: dragRect.width,
            height: dragRect.height,
          }}
        />
      )}

      {active && hoverInfo && !pending && !isDragging && (
        <div className="ctf-hover-tip" style={{ left: hoverInfo.x, top: hoverInfo.y - 36 }}>
          {hoverInfo.name}
        </div>
      )}

      {active && pending && (
        <>
          {pending.multiSelectElements?.map((el, i) => {
            if (!document.contains(el)) return null;
            const r = el.getBoundingClientRect();
            return renderOutline(
              { x: r.left, y: r.top + scrollY, width: r.width, height: r.height },
              true,
              pending.isFixed,
            );
          })}
          {pending.boundingBox && !pending.multiSelectElements?.length &&
            renderOutline(pending.boundingBox, pending.isMultiSelect, pending.isFixed)}
          <PendingMarker
            x={pending.x}
            y={pending.isFixed ? pending.y : pending.y - scrollY}
            isMultiSelect={pending.isMultiSelect}
            isExiting={pendingExiting}
          />
          <AnnotationPopup
            ref={popupRef}
            element={pending.element}
            selectedText={pending.selectedText}
            computedStyles={pending.computedStylesObj}
            draft={pendingDraft}
            onDraftChange={setPendingDraft}
            placeholder={
              pending.element === "Area selection"
                ? "What should change in this area?"
                : pending.isMultiSelect
                  ? "Feedback for this group of elements..."
                  : "What should change?"
            }
            submitLabel="Send"
            accentColor={getAccentColor(settings, pending.isMultiSelect)}
            isExiting={pendingExiting}
            onSubmit={(text) => void addAnnotation(text, pending)}
            onCancel={cancelPending}
            style={popupStyle(pending.x, pending.isFixed ? pending.y : pending.y - scrollY)}
          />
        </>
      )}

      {editing && (
        <AnnotationPopup
          ref={editPopupRef}
          element={editing.element}
          selectedText={editing.selectedText ?? undefined}
          draft={editDraft}
          onDraftChange={setEditDraft}
          submitLabel="Save"
          accentColor={getAccentColor(settings, editing.isMultiSelect)}
          isExiting={editExiting}
          onSubmit={(text) => {
            void addAnnotation(
              text,
              {
                x: editing.x ?? 50,
                y: editing.y ?? 0,
                clientY: 0,
                element: editing.element,
                elementPath: editing.path,
                context: contextForEdit(editing),
              },
              editing.id,
            );
          }}
          onCancel={() => {
            setEditExiting(true);
            originalSetTimeout(() => {
              setEditing(null);
              setEditExiting(false);
              setEditDraft("");
            }, 150);
          }}
          onDelete={() => deleteAnnotation(editing.id)}
          style={popupStyle(
            editing.x ?? 50,
            editing.isFixed ? (editing.y ?? 0) : (editing.y ?? 0) - scrollY,
          )}
        />
      )}

      {active && hoveredAnnotation && !pending && !editing && (
        <>
          {hoveredAnnotation.elementBoundingBoxes?.map((box, i) => (
            <div key={`hover-box-${i}`}>
              {renderOutline(box, true, hoveredAnnotation.isFixed)}
            </div>
          ))}
          {hoveredAnnotation.boundingBox &&
            !hoveredAnnotation.elementBoundingBoxes?.length &&
            renderOutline(
              hoveredAnnotation.boundingBox,
              hoveredAnnotation.isMultiSelect,
              hoveredAnnotation.isFixed,
            )}
        </>
      )}

      {showMarkers && active && (
        <>
          <div className="ctf-markers-scroll">
            {scrollAnns.map((a, i) => (
              <AnnotationMarker
                key={a.id}
                annotation={{ ...a, y: (a.y ?? 0) - scrollY }}
                index={i}
                isHovered={hoveredId === a.id}
                isFocused={focusedId === a.id}
                isExiting={isClearing || exitingIds.has(a.id)}
                isEditingAny={!!editing}
                markerClickBehavior={settings.markerClickBehavior}
                onHover={(ann) => setHoveredId(ann?.id ?? null)}
                onDismiss={dismissAnnotation}
                onApplyFix={applyReadyFixes}
                onClick={(ann) => {
                  const target = annotations.find((x) => x.id === ann.id) ?? ann;
                  if (settings.markerClickBehavior === "delete") {
                    deleteAnnotation(ann.id);
                  } else {
                    setEditDraft(target.comment);
                    setEditing(target);
                  }
                }}
                onContextMenu={(ann) => {
                  const target = annotations.find((x) => x.id === ann.id) ?? ann;
                  setEditDraft(target.comment);
                  setEditing(target);
                }}
              />
            ))}
          </div>
          <div className="ctf-markers-fixed">
            {fixedAnns.map((a, i) => (
              <AnnotationMarker
                key={a.id}
                annotation={a}
                index={i}
                isHovered={hoveredId === a.id}
                isFocused={focusedId === a.id}
                isExiting={isClearing || exitingIds.has(a.id)}
                isEditingAny={!!editing}
                markerClickBehavior={settings.markerClickBehavior}
                onHover={(ann) => setHoveredId(ann?.id ?? null)}
                onDismiss={dismissAnnotation}
                onApplyFix={applyReadyFixes}
                onClick={(ann) => {
                  const target = annotations.find((x) => x.id === ann.id) ?? ann;
                  if (settings.markerClickBehavior === "delete") {
                    deleteAnnotation(ann.id);
                  } else {
                    setEditDraft(target.comment);
                    setEditing(target);
                  }
                }}
                onContextMenu={(ann) => {
                  const target = annotations.find((x) => x.id === ann.id) ?? ann;
                  setEditDraft(target.comment);
                  setEditing(target);
                }}
              />
            ))}
          </div>
        </>
      )}

      {selectionChip && active && !pending && (
        <button
          type="button"
          className="ctf-selection-chip"
          style={{ left: selectionChip.x, top: selectionChip.y }}
          onClick={(e) => {
            e.stopPropagation();
            const el = selectionChip.element as HTMLElement;
            const ctx = captureAnnotationContext(el, selectionChip.text);
            const r = el.getBoundingClientRect();
            setPendingDraft("");
            setPending({
              x: (selectionChip.x / window.innerWidth) * 100,
              y: r.top + window.scrollY + 12,
              clientY: r.top,
              element: ctx.element,
              elementPath: ctx.elementPath,
              selectedText: selectionChip.text,
              boundingBox: ctx.boundingBox ?? undefined,
              isFixed: ctx.isFixed,
              targetElement: el,
              computedStyles: ctx.computedStyles,
              computedStylesObj: ctx.computedStylesObj,
              context: ctx,
            });
            setSelectionChip(null);
            window.getSelection()?.removeAllRanges();
          }}
        >
          Comment on selection
        </button>
      )}

      <Toolbar
        active={active}
        expanded={active}
        frozen={frozen}
        showMarkers={showMarkers}
        copied={copied}
        annotations={annotations}
        settings={settings}
        showSettings={showSettings}
        showHistory={showHistory}
        toolbarPos={toolbarPos}
        anchorRight={isToolbarAnchorRight(toolbarPos)}
        onToggleFreeze={() => setFrozen(toggleFreeze())}
        onToggleMarkers={() => setShowMarkers((v) => !v)}
        onCopy={() => void copyOutput()}
        onClear={clearAll}
        onToggleSettings={() => {
          setShowHistory(false);
          setShowSettings((v) => !v);
        }}
        onToggleHistory={() => {
          setShowSettings(false);
          setShowHistory((v) => !v);
        }}
        onSettingsChange={(patch) => setSettings((s) => ({ ...s, ...patch }))}
        onDeactivate={deactivate}
        onDragStart={onToolbarDragStart}
        onJumpTo={jumpToAnnotation}
        onDismiss={dismissAnnotation}
        onRestore={restoreAnnotation}
      />

      {toast && <div className="ctf-toast">{toast}</div>}
    </div>
  );

  return createPortal(root, document.body);
}

declare const __CTF_STYLES__: string;
