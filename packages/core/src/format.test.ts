import { describe, expect, it } from "vitest";
import { formatAnnotationMarkdown } from "./format.js";
import type { Annotation } from "./types.js";

describe("formatAnnotationMarkdown", () => {
  it("includes selector and comment", () => {
    const markdown = formatAnnotationMarkdown({
      id: "ann_test",
      ts: "2026-01-01T00:00:00.000Z",
      comment: "Increase padding",
      page: "index.html",
      pageUrl: "/index.html",
      root: ".",
      element: 'button "Get started"',
      selector: "button.primary",
      path: "body > button.primary",
      text: "Get started",
      classes: "primary",
      box: null,
      selectedText: null,
      markdown: "",
    } satisfies Annotation);

    expect(markdown).toContain("ann_test");
    expect(markdown).toContain("button.primary");
    expect(markdown).toContain("Increase padding");
  });
});
