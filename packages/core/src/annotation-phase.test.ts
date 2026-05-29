import { describe, expect, it } from "vitest";

import {
  reconcileAnnotationPhases,
  resolvePhase,
  type Annotation,
} from "./index.js";

function sampleAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: "ann_1",
    ts: new Date().toISOString(),
    comment: "Fix this",
    page: "index.html",
    pageUrl: "/index.html",
    root: ".",
    element: "h1",
    selector: "h1",
    path: "h1",
    text: "Hello",
    classes: null,
    box: null,
    selectedText: null,
    markdown: "## test",
    ...overrides,
  };
}

describe("resolvePhase", () => {
  it("returns undefined for local annotations", () => {
    const ann = sampleAnnotation({ status: "local" });
    expect(resolvePhase(ann, new Set(["ann_1"]))).toBeUndefined();
  });

  it("returns fixing when sent but not processed", () => {
    const ann = sampleAnnotation({ status: "sent" });
    expect(resolvePhase(ann, new Set())).toBe("fixing");
  });

  it("returns ready when sent and processed", () => {
    const ann = sampleAnnotation({ status: "sent" });
    expect(resolvePhase(ann, new Set(["ann_1"]))).toBe("ready");
  });

  it("preserves dismissed over processed state", () => {
    const ann = sampleAnnotation({ status: "sent", phase: "dismissed" });
    expect(resolvePhase(ann, new Set(["ann_1"]))).toBe("dismissed");
  });
});

describe("reconcileAnnotationPhases", () => {
  it("updates phases from processed ids", () => {
    const anns = [
      sampleAnnotation({ id: "ann_a", status: "sent" }),
      sampleAnnotation({ id: "ann_b", status: "sent", phase: "dismissed" }),
      sampleAnnotation({ id: "ann_c", status: "local" }),
    ];
    const result = reconcileAnnotationPhases(anns, ["ann_a"]);
    expect(result[0]?.phase).toBe("ready");
    expect(result[1]?.phase).toBe("dismissed");
    expect(result[2]?.phase).toBeUndefined();
  });
});
