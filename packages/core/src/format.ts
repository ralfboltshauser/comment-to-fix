import type { Annotation } from "./types.js";

export function formatAnnotationMarkdown(annotation: Annotation): string {
  const lines = [
    `## Comment to Fix — ${annotation.id}`,
    `**Page:** ${annotation.page}`,
    `**Element:** ${annotation.element}`,
    `**Selector:** \`${annotation.selector}\``,
    `**Path:** \`${annotation.path}\``,
    `**Comment:** ${annotation.comment}`,
  ];

  if (annotation.text) lines.push(`**Current text:** "${annotation.text}"`);
  if (annotation.selectedText) lines.push(`**Selected text:** "${annotation.selectedText}"`);
  if (annotation.classes) lines.push(`**Classes:** ${annotation.classes}`);
  if (annotation.box) {
    lines.push(`**Position:** ${annotation.box.x}px, ${annotation.box.y}px (${annotation.box.w}×${annotation.box.h}px)`);
  }

  return lines.join("\n");
}
