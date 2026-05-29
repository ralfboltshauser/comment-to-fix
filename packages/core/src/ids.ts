export function createAnnotationId(): string {
  return `ann_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
}
