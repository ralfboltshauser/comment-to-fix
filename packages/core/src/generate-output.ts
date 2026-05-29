import type { Annotation, OutputDetailLevel } from "./types.js";

export const OUTPUT_DETAIL_OPTIONS: { value: OutputDetailLevel; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "standard", label: "Standard" },
  { value: "detailed", label: "Detailed" },
  { value: "forensic", label: "Forensic" },
];

export function generateOutput(
  annotations: Annotation[],
  pathname: string,
  detailLevel: OutputDetailLevel = "standard",
): string {
  if (annotations.length === 0) return "";

  const viewport =
    typeof window !== "undefined"
      ? `${window.innerWidth}×${window.innerHeight}`
      : "unknown";

  let output = `## Page Feedback: ${pathname}\n`;

  if (detailLevel === "forensic") {
    output += `\n**Environment:**\n`;
    output += `- Viewport: ${viewport}\n`;
    if (typeof window !== "undefined") {
      output += `- URL: ${window.location.href}\n`;
      output += `- Timestamp: ${new Date().toISOString()}\n`;
    }
    output += `\n---\n`;
  } else if (detailLevel !== "compact") {
    output += `**Viewport:** ${viewport}\n`;
  }
  output += "\n";

  annotations.forEach((a, i) => {
    if (detailLevel === "compact") {
      output += `${i + 1}. **${a.element}**: ${a.comment}`;
      if (a.selectedText) {
        output += ` (re: "${a.selectedText.slice(0, 30)}${a.selectedText.length > 30 ? "..." : ""}")`;
      }
      output += "\n";
    } else if (detailLevel === "forensic") {
      output += `### ${i + 1}. ${a.element}\n`;
      if (a.fullPath || a.path) output += `**Full DOM Path:** ${a.fullPath ?? a.path}\n`;
      if (a.classes) output += `**CSS Classes:** ${a.classes}\n`;
      if (a.boundingBox || a.box) {
        const bb = a.boundingBox ?? a.box;
        if (bb) {
          const w = "width" in bb ? bb.width : bb.w;
          const h = "height" in bb ? bb.height : bb.h;
          output += `**Position:** x:${Math.round(bb.x)}, y:${Math.round(bb.y)} (${Math.round(w)}×${Math.round(h)}px)\n`;
        }
      }
      if (a.selectedText) output += `**Selected text:** "${a.selectedText}"\n`;
      if (a.computedStyles) output += `**Computed Styles:** ${a.computedStyles}\n`;
      if (a.accessibility) output += `**Accessibility:** ${a.accessibility}\n`;
      output += `**Feedback:** ${a.comment}\n\n`;
    } else {
      output += `### ${i + 1}. ${a.element}\n`;
      output += `**Location:** ${a.path}\n`;
      output += `**Selector:** \`${a.selector}\`\n`;
      if (detailLevel === "detailed") {
        if (a.classes) output += `**Classes:** ${a.classes}\n`;
        if (a.box) {
          output += `**Position:** ${a.box.x}px, ${a.box.y}px (${a.box.w}×${a.box.h}px)\n`;
        }
      }
      if (a.selectedText) output += `**Selected text:** "${a.selectedText}"\n`;
      if (detailLevel === "detailed" && a.text && !a.selectedText) {
        output += `**Context:** ${a.text.slice(0, 100)}\n`;
      }
      output += `**Feedback:** ${a.comment}\n\n`;
    }
  });

  return output.trim();
}
