import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  appendAnnotation,
  getPendingAnnotations,
  markProcessed,
  type Annotation,
} from "../src/index.js";

function sampleAnnotation(id: string): Annotation {
  return {
    id,
    ts: new Date().toISOString(),
    comment: "Make this bigger",
    page: "sample.html",
    pageUrl: "/sample.html",
    root: ".",
    element: "h1",
    selector: "h1.hero-title",
    path: "main > h1.hero-title",
    text: "Sample Proposal Headline",
    classes: "hero-title",
    box: { x: 0, y: 0, w: 100, h: 40 },
    selectedText: null,
    markdown: "## test",
  };
}

describe("inbox", () => {
  it("appends and tracks pending annotations", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ctf-inbox-"));
    const inbox = path.join(dir, "inbox.jsonl");
    const processed = path.join(dir, "processed.json");

    await appendAnnotation(sampleAnnotation("ann_1"), inbox);
    await appendAnnotation(sampleAnnotation("ann_2"), inbox);

    const pending = await getPendingAnnotations(inbox, processed);
    expect(pending).toHaveLength(2);
    expect(pending[0]?.id).toBe("ann_1");

    await markProcessed("ann_1", inbox, processed);

    const after = await getPendingAnnotations(inbox, processed);
    expect(after).toHaveLength(1);
    expect(after[0]?.id).toBe("ann_2");
  });

  it("throws when marking unknown annotation", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ctf-inbox-"));
    const inbox = path.join(dir, "inbox.jsonl");
    const processed = path.join(dir, "processed.json");

    await appendAnnotation(sampleAnnotation("ann_1"), inbox);

    await expect(markProcessed("missing", inbox, processed)).rejects.toThrow(
      "Annotation not found",
    );
  });
});
