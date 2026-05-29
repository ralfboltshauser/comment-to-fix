import type { ServerResponse } from "node:http";

import type { SseEvent } from "./reload-policy.js";

const clients = new Set<ServerResponse>();

export type FileChangeEvent = Extract<SseEvent, { kind: "css" | "html" | "js" }>;

export function addReloadClient(res: ServerResponse): void {
  clients.add(res);
}

export function removeReloadClient(res: ServerResponse): void {
  clients.delete(res);
}

function broadcast(event: SseEvent): void {
  const payload = JSON.stringify(event);
  for (const client of clients) {
    client.write(`data: ${payload}\n\n`);
  }
}

export function broadcastFileChange(event: FileChangeEvent): void {
  broadcast(event);
}

export function broadcastProcessedUpdate(processedIds: string[], lastId: string | null): void {
  broadcast({ kind: "processed", processedIds, lastId });
}

/** @deprecated use broadcastFileChange */
export function broadcastReload(): void {
  broadcastFileChange({ kind: "html", path: "" });
}

export function handleEventsRequest(res: ServerResponse): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("\n");
  addReloadClient(res);

  const keepAlive = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 25000);

  res.on("close", () => {
    clearInterval(keepAlive);
    removeReloadClient(res);
  });
}
