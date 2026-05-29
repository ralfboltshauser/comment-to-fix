import type { Annotation, AnnotationPhase } from "./types.js";

export function resolvePhase(
  ann: Annotation,
  processedIds: ReadonlySet<string>,
): AnnotationPhase | undefined {
  if (ann.phase === "dismissed") return "dismissed";
  if (ann.status !== "sent") return undefined;
  return processedIds.has(ann.id) ? "ready" : "fixing";
}

export function reconcileAnnotationPhases(
  annotations: Annotation[],
  processedIds: readonly string[],
): Annotation[] {
  const set = new Set(processedIds);
  return annotations.map((ann) => {
    const phase = resolvePhase(ann, set);
    if (phase === undefined) {
      const { phase: _removed, ...rest } = ann;
      return rest as Annotation;
    }
    return { ...ann, phase };
  });
}
