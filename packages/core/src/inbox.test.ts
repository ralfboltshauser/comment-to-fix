import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  appendAnnotation,
  DEFAULT_INBOX_FILE,
  DEFAULT_PREVIEW_PORT,
  getPendingAnnotations,
  inboxPathForPort,
  markProcessed,
  processedPathForInbox,
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

describe("parallel session paths", () => {
  it("keeps the default inbox for the default port", () => {
    expect(inboxPathForPort(DEFAULT_PREVIEW_PORT)).toBe(DEFAULT_INBOX_FILE);
  });

  it("scopes the inbox by port for non-default ports", () => {
    expect(inboxPathForPort(5174)).toBe(".comment-to-fix/inbox-5174.jsonl");
    expect(inboxPathForPort(5175)).toBe(".comment-to-fix/inbox-5175.jsonl");
  });

  it("gives each port a distinct inbox (no collisions)", () => {
    const a = inboxPathForPort(5174);
    const b = inboxPathForPort(5175);
    expect(a).not.toBe(b);
    expect(a).not.toBe(inboxPathForPort(DEFAULT_PREVIEW_PORT));
  });

  it("co-locates processed state next to the inbox", () => {
    expect(processedPathForInbox(".comment-to-fix/inbox.jsonl")).toBe(
      path.join(".comment-to-fix", "processed.json"),
    );
    expect(processedPathForInbox(".comment-to-fix/inbox-5174.jsonl")).toBe(
      path.join(".comment-to-fix", "processed-5174.json"),
    );
    expect(processedPathForInbox("/tmp/sess/inbox-5180.jsonl")).toBe(
      path.join("/tmp/sess", "processed-5180.json"),
    );
  });

  it("derives a distinct processed path for each port-scoped inbox", () => {
    const p1 = processedPathForInbox(inboxPathForPort(5174));
    const p2 = processedPathForInbox(inboxPathForPort(5175));
    expect(p1).not.toBe(p2);
  });
});
