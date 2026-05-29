import fs from "node:fs";
import path from "node:path";

import chokidar from "chokidar";

import { getProcessedAnnotationIds, readProcessedState } from "@comment-to-fix/core";

import { broadcastProcessedUpdate } from "./live-reload.js";

async function emitProcessedUpdate(inboxPath: string, processedPath: string): Promise<void> {
  try {
    const [processedIds, state] = await Promise.all([
      getProcessedAnnotationIds(inboxPath, processedPath),
      readProcessedState(processedPath),
    ]);
    broadcastProcessedUpdate(processedIds, state.lastId);
  } catch {
    // ignore read errors during partial writes
  }
}

export function startProcessedWatcher(inboxPath: string, processedPath: string): () => void {
  const resolved = path.resolve(processedPath);
  const dir = path.dirname(resolved);

  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(resolved)) {
    fs.writeFileSync(resolved, JSON.stringify({ lastId: null, lastLine: 0 }, null, 2) + "\n");
  }

  const emit = () => {
    void emitProcessedUpdate(inboxPath, resolved);
  };

  const watcher = chokidar.watch(resolved, { ignoreInitial: true });

  watcher.on("add", emit);
  watcher.on("change", emit);

  void emitProcessedUpdate(inboxPath, resolved);

  return () => {
    void watcher.close();
  };
}
