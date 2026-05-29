import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import { inboxPathForPort, writeProcessedState } from "@comment-to-fix/core";

import { startPreviewServer } from "./preview-server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../..");

async function readSseEvent(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeoutMs = 5000,
): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  let buffer = "";

  while (Date.now() < deadline) {
    const { value, done } = await Promise.race([
      reader.read(),
      new Promise<{ value: undefined; done: false }>((resolve) =>
        setTimeout(() => resolve({ value: undefined, done: false }), 200),
      ),
    ]);

    if (value) {
      buffer += new TextDecoder().decode(value);
      const match = buffer.match(/data: (\{.*\})/);
      if (match?.[1]) return match[1];
    }
    if (done) break;
  }

  return null;
}

describe("preview server", () => {
  let close: (() => void) | null = null;

  afterEach(() => {
    close?.();
    close = null;
  });

  it("serves injected HTML and accepts comments", async () => {
    const inboxDir = await fs.mkdtemp(path.join(os.tmpdir(), "ctf-server-"));
    const inbox = path.join(inboxDir, "inbox.jsonl");
    const fixture = path.join(repoRoot, "fixtures/sample.html");

    const server = await startPreviewServer({
      file: fixture,
      root: path.dirname(fixture),
      rootLabel: "fixtures",
      port: 8765,
      open: false,
      inbox,
    });

    close = server.close;

    const htmlRes = await fetch(`${server.url}`);
    const html = await htmlRes.text();
    expect(htmlRes.ok).toBe(true);
    expect(html).toContain("/__ctf__/overlay.js");
    expect(html).toContain("/__ctf__/live.js");

    const postRes = await fetch("http://127.0.0.1:8765/__ctf__/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "ann_test",
        comment: "Make headline bolder",
        page: "sample.html",
        pageUrl: "/sample.html",
        root: "fixtures",
        element: "h1",
        selector: "h1.hero-title",
        path: "main > h1.hero-title",
        text: "Sample Proposal Headline",
        classes: "hero-title",
        box: { x: 0, y: 0, w: 10, h: 10 },
        selectedText: null,
      }),
    });

    expect(postRes.ok).toBe(true);

    const inboxRaw = await fs.readFile(inbox, "utf8");
    expect(inboxRaw.trim()).toContain("ann_test");
    expect(inboxRaw).toContain("Make headline bolder");
  });

  it("exposes processed status and broadcasts SSE on mark-processed", async () => {
    const inboxDir = await fs.mkdtemp(path.join(os.tmpdir(), "ctf-server-"));
    const inbox = path.join(inboxDir, "inbox.jsonl");
    const processed = path.join(inboxDir, "processed.json");
    const fixture = path.join(repoRoot, "fixtures/sample.html");

    const server = await startPreviewServer({
      file: fixture,
      root: path.dirname(fixture),
      rootLabel: "fixtures",
      port: 8766,
      open: false,
      inbox,
    });

    close = server.close;

    const statusBefore = await fetch("http://127.0.0.1:8766/__ctf__/status");
    expect(statusBefore.ok).toBe(true);
    const beforeJson = (await statusBefore.json()) as { processedIds: string[] };
    expect(beforeJson.processedIds).toEqual([]);

    await fetch("http://127.0.0.1:8766/__ctf__/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "ann_sse",
        comment: "Test SSE",
        page: "sample.html",
        pageUrl: "/sample.html",
        root: "fixtures",
        element: "h1",
        selector: "h1.hero-title",
        path: "main > h1.hero-title",
        text: "Sample",
        classes: null,
        box: null,
        selectedText: null,
      }),
    });

    const eventsRes = await fetch("http://127.0.0.1:8766/__ctf__/events");
    expect(eventsRes.ok).toBe(true);
    const reader = eventsRes.body!.getReader();

    await writeProcessedState({ lastId: "ann_sse", lastLine: 1 }, processed);

    const eventRaw = await readSseEvent(reader);
    expect(eventRaw).not.toBeNull();
    const event = JSON.parse(eventRaw!) as { kind: string; processedIds: string[] };
    expect(event.kind).toBe("processed");
    expect(event.processedIds).toContain("ann_sse");

    const statusAfter = await fetch("http://127.0.0.1:8766/__ctf__/status");
    const afterJson = (await statusAfter.json()) as { processedIds: string[] };
    expect(afterJson.processedIds).toContain("ann_sse");

    reader.cancel();
  });

  it("auto-increments the port when the requested one is busy", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ctf-parallel-"));
    const fixture = path.join(repoRoot, "fixtures/sample.html");
    const base = {
      file: fixture,
      root: path.dirname(fixture),
      rootLabel: "fixtures",
      port: 8770,
      open: false,
    };

    const a = await startPreviewServer({ ...base, inbox: path.join(dir, "a.jsonl") });
    const b = await startPreviewServer({ ...base, inbox: path.join(dir, "b.jsonl") });

    try {
      expect(a.port).toBe(8770);
      // Negative guard: the second session must NOT reuse the busy port.
      expect(b.port).not.toBe(8770);
      expect(b.port).toBe(8771);
      expect(b.url).toContain(":8771");

      // Both servers respond independently on their own ports.
      expect((await fetch(`${a.url}`)).ok).toBe(true);
      expect((await fetch(`${b.url}`)).ok).toBe(true);
    } finally {
      a.close();
      b.close();
    }
  });

  it("respects an explicit inbox and otherwise derives one from the bound port", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ctf-inbox-"));
    const explicitInbox = path.join(dir, "custom.jsonl");
    const fixture = path.join(repoRoot, "fixtures/sample.html");
    const base = {
      file: fixture,
      root: path.dirname(fixture),
      rootLabel: "fixtures",
      open: false,
    };

    const explicit = await startPreviewServer({ ...base, port: 8780, inbox: explicitInbox });
    try {
      expect(explicit.inbox).toBe(explicitInbox);
    } finally {
      explicit.close();
    }

    const derived = await startPreviewServer({ ...base, port: 8781 });
    try {
      expect(derived.inbox).toBe(inboxPathForPort(8781));
      // Negative guard: a non-default port must not fall back to the default inbox.
      expect(derived.inbox).not.toBe(inboxPathForPort(5173));
    } finally {
      derived.close();
      await fs.rm(path.resolve(".comment-to-fix/processed-8781.json"), { force: true });
    }
  });
});
