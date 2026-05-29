import {
  captureAnnotationContext,
  contextFromAnnotation,
  createAnnotationId,
  formatAnnotationMarkdown,
  resolveElementFromSelector,
  type Annotation,
  type CapturedAnnotationContext,
} from "@comment-to-fix/core";

function getApiUrl(): string {
  const script = document.querySelector<HTMLScriptElement>('script[src*="overlay.js"]');
  return script?.dataset.api ?? "/__ctf__/comment";
}

function getPageMeta() {
  const script = document.querySelector<HTMLScriptElement>('script[src*="overlay.js"]');
  return {
    page: document.location.pathname.replace(/^\//, "") || "index.html",
    pageUrl: document.location.pathname + document.location.search,
    root: script?.dataset.root ?? ".",
  };
}

export function buildAnnotationFromContext(
  comment: string,
  ctx: CapturedAnnotationContext,
  marker: { x: number; y: number },
  extra?: Partial<Annotation>,
): Annotation {
  const meta = getPageMeta();
  const id = createAnnotationId();
  const annotation: Annotation = {
    id,
    ts: new Date().toISOString(),
    comment,
    page: meta.page,
    pageUrl: meta.pageUrl,
    root: meta.root,
    element: ctx.element,
    selector: ctx.selector,
    path: ctx.path,
    text: ctx.text,
    classes: ctx.classes,
    box: ctx.box,
    selectedText: ctx.selectedText,
    markdown: "",
    x: marker.x,
    y: marker.y,
    timestamp: Date.now(),
    boundingBox: ctx.boundingBox ?? undefined,
    nearbyText: ctx.nearbyText,
    computedStyles: ctx.computedStyles,
    accessibility: ctx.accessibility,
    fullPath: ctx.fullPath,
    isFixed: ctx.isFixed,
    status: "local",
    ...extra,
  };
  annotation.markdown = formatAnnotationMarkdown(annotation);
  return annotation;
}

export async function submitAnnotation(annotation: Annotation): Promise<Annotation> {
  const response = await fetch(getApiUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...annotation, status: "sent" }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Submit failed (${response.status})`);
  }

  return { ...annotation, status: "sent" };
}

export { captureAnnotationContext, getPageMeta, contextFromAnnotation, resolveElementFromSelector };

export async function fetchProcessedStatus(): Promise<{ processedIds: string[] } | null> {
  try {
    const response = await fetch("/__ctf__/status");
    if (!response.ok) return null;
    return (await response.json()) as { processedIds: string[] };
  } catch {
    return null;
  }
}

export function contextForEdit(annotation: Annotation): CapturedAnnotationContext {
  const el = resolveElementFromSelector(annotation.selector);
  if (el) return captureAnnotationContext(el, annotation.selectedText);
  return contextFromAnnotation(annotation);
}
