import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Annotation, ProcessedState } from "./index.js";
import { DEFAULT_INBOX_FILE, DEFAULT_PROCESSED_FILE } from "./index.js";

export async function ensureInboxDir(
  inboxPath: string = DEFAULT_INBOX_FILE,
): Promise<void> {
  await mkdir(path.dirname(inboxPath), { recursive: true });
}

/**
 * Co-locate the processed-state file next to its inbox so each session
 * (default or port-scoped) keeps independent progress.
 *
 * `inbox.jsonl` -> `processed.json`, `inbox-5174.jsonl` -> `processed-5174.json`.
 */
export function processedPathForInbox(inboxPath: string): string {
  const dir = path.dirname(inboxPath);
  const base = path
    .basename(inboxPath)
    .replace(/\.jsonl$/, ".json")
    .replace(/^inbox/, "processed");
  return path.join(dir, base);
}

export async function appendAnnotation(
  annotation: Annotation,
  inboxPath: string = DEFAULT_INBOX_FILE,
): Promise<void> {
  await ensureInboxDir(inboxPath);
  await appendFile(inboxPath, `${JSON.stringify(annotation)}\n`, "utf8");
}

export async function readProcessedState(
  processedPath: string = DEFAULT_PROCESSED_FILE,
): Promise<ProcessedState> {
  try {
    const raw = await readFile(processedPath, "utf8");
    return JSON.parse(raw) as ProcessedState;
  } catch {
    return { lastId: null, lastLine: 0 };
  }
}

export async function writeProcessedState(
  state: ProcessedState,
  processedPath: string = DEFAULT_PROCESSED_FILE,
): Promise<void> {
  await ensureInboxDir(processedPath);
  await writeFile(processedPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function readInboxLines(
  inboxPath: string = DEFAULT_INBOX_FILE,
): Promise<string[]> {
  try {
    const raw = await readFile(inboxPath, "utf8");
    return raw.split("\n").filter((line) => line.trim().length > 0);
  } catch {
    return [];
  }
}

export async function getPendingAnnotations(
  inboxPath: string = DEFAULT_INBOX_FILE,
  processedPath: string = DEFAULT_PROCESSED_FILE,
): Promise<Annotation[]> {
  const state = await readProcessedState(processedPath);
  const lines = await readInboxLines(inboxPath);
  const pending = lines.slice(state.lastLine);

  return pending.map((line) => JSON.parse(line) as Annotation);
}

/** IDs of inbox annotations the agent has marked processed. */
export async function getProcessedAnnotationIds(
  inboxPath: string = DEFAULT_INBOX_FILE,
  processedPath: string = DEFAULT_PROCESSED_FILE,
): Promise<string[]> {
  const state = await readProcessedState(processedPath);
  const lines = await readInboxLines(inboxPath);
  return lines.slice(0, state.lastLine).map((line) => (JSON.parse(line) as Annotation).id);
}

export async function markProcessed(
  id: string,
  inboxPath: string = DEFAULT_INBOX_FILE,
  processedPath: string = DEFAULT_PROCESSED_FILE,
): Promise<void> {
  const lines = await readInboxLines(inboxPath);
  const index = lines.findIndex((line) => {
    try {
      return (JSON.parse(line) as Annotation).id === id;
    } catch {
      return false;
    }
  });

  if (index === -1) {
    throw new Error(`Annotation not found: ${id}`);
  }

  await writeProcessedState(
    {
      lastId: id,
      lastLine: index + 1,
    },
    processedPath,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForNextAnnotation(
  inboxPath: string = DEFAULT_INBOX_FILE,
  processedPath: string = DEFAULT_PROCESSED_FILE,
  pollMs = 300,
): Promise<Annotation> {
  while (true) {
    const pending = await getPendingAnnotations(inboxPath, processedPath);
    if (pending.length > 0) {
      return pending[0]!;
    }
    await sleep(pollMs);
  }
}
