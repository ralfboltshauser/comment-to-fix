import type { Annotation, OverlaySettings } from "./types.js";
import { DEFAULT_OVERLAY_SETTINGS } from "./types.js";
import type { CapturedAnnotationContext } from "./element-identification.js";

const ANNOTATIONS_PREFIX = "ctf-annotations-";
const SETTINGS_KEY = "ctf-overlay-settings";
const TOOLBAR_POS_KEY = "ctf-toolbar-pos-v2";
const DEFAULT_RETENTION_DAYS = 7;

export function getPageKey(): string {
  if (typeof window === "undefined") return "/";
  return window.location.pathname + window.location.search;
}

export function getAnnotationsStorageKey(pageKey: string): string {
  return `${ANNOTATIONS_PREFIX}${pageKey}`;
}

export function loadAnnotations(pageKey: string): Annotation[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(getAnnotationsStorageKey(pageKey));
    if (!stored) return [];
    const data = JSON.parse(stored) as Annotation[];
    const cutoff = Date.now() - DEFAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    return data.filter((a) => !a.timestamp || a.timestamp > cutoff);
  } catch {
    return [];
  }
}

export function saveAnnotations(pageKey: string, annotations: Annotation[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getAnnotationsStorageKey(pageKey), JSON.stringify(annotations));
  } catch {
    // ignore
  }
}

export function clearAnnotations(pageKey: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getAnnotationsStorageKey(pageKey));
  } catch {
    // ignore
  }
}

export function loadSettings(): OverlaySettings {
  if (typeof window === "undefined") return { ...DEFAULT_OVERLAY_SETTINGS };
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return { ...DEFAULT_OVERLAY_SETTINGS };
    return { ...DEFAULT_OVERLAY_SETTINGS, ...JSON.parse(stored) };
  } catch {
    return { ...DEFAULT_OVERLAY_SETTINGS };
  }
}

export function saveSettings(settings: OverlaySettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function loadToolbarPos(): { x: number; y: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(TOOLBAR_POS_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as { x: number; y: number };
  } catch {
    return null;
  }
}

export function saveToolbarPos(x: number, y: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOOLBAR_POS_KEY, JSON.stringify({ x, y }));
  } catch {
    // ignore
  }
}

// --- Session snapshot (sessionStorage, tab-scoped) ---

export const PENDING_RELOAD_KEY = "ctf-pending-reload";

const SESSION_PREFIX = "ctf-session-";

export type SerializablePending = {
  x: number;
  y: number;
  clientY: number;
  element: string;
  elementPath: string;
  selectedText?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
  isMultiSelect?: boolean;
  isFixed?: boolean;
  elementBoundingBoxes?: { x: number; y: number; width: number; height: number }[];
  computedStyles?: string;
  computedStylesObj?: Record<string, string>;
  context: CapturedAnnotationContext;
};

export type OverlaySessionDraft = {
  kind: "pending" | "edit";
  text: string;
  pending?: SerializablePending;
  editingId?: string;
};

export type OverlaySessionSnapshot = {
  scrollY: number;
  active: boolean;
  draft?: OverlaySessionDraft;
};

function getSessionKey(pageKey: string): string {
  return `${SESSION_PREFIX}${pageKey}`;
}

export function saveSession(pageKey: string, snapshot: OverlaySessionSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(getSessionKey(pageKey), JSON.stringify(snapshot));
  } catch {
    // ignore
  }
}

export function loadSession(pageKey: string): OverlaySessionSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(getSessionKey(pageKey));
    if (!stored) return null;
    return JSON.parse(stored) as OverlaySessionSnapshot;
  } catch {
    return null;
  }
}

export function clearSession(pageKey: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(getSessionKey(pageKey));
  } catch {
    // ignore
  }
}

export function hasPendingReload(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(PENDING_RELOAD_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearPendingReload(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PENDING_RELOAD_KEY);
  } catch {
    // ignore
  }
}
