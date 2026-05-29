import { describe, expect, it } from "vitest";
import { generateOutput } from "./generate-output.js";
import type { Annotation } from "./types.js";

const baseAnnotation = (): Annotation => ({
  id: "ann_test",
  ts: "2026-01-01T00:00:00.000Z",
  comment: "Increase padding",
  page: "index.html",
  pageUrl: "/index.html",
  root: ".",
  element: 'button "Get started"',
  selector: "button.primary-cta",
  path: "main > button.primary-cta",
  text: "Get started",
  classes: "primary-cta",
  box: { x: 0, y: 0, w: 100, h: 40 },
  selectedText: null,
  markdown: "",
});

describe("generateOutput", () => {
  it("includes element and comment in standard mode", () => {
    const output = generateOutput([baseAnnotation()], "/index.html", "standard");
    expect(output).toContain('button "Get started"');
    expect(output).toContain("Increase padding");
    expect(output).toContain("button.primary-cta");
  });

  it("compact mode is minimal", () => {
    const output = generateOutput([baseAnnotation()], "/index.html", "compact");
    expect(output).toContain("1.");
    expect(output).not.toContain("###");
  });

  it("returns empty for no annotations", () => {
    expect(generateOutput([], "/index.html")).toBe("");
  });

  it("forensic mode omits optional sections when data is missing", () => {
    const output = generateOutput([baseAnnotation()], "/index.html", "forensic");
    expect(output).toContain("Increase padding");
    expect(output).not.toContain("Accessibility:");
  });
});
