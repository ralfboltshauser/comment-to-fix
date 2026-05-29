import type { IncomingMessage, ServerResponse } from "node:http";

import {
  appendAnnotation,
  createAnnotationId,
  DEFAULT_PROCESSED_FILE,
  formatAnnotationMarkdown,
  type Annotation,
} from "@comment-to-fix/core";

import type { PreviewOptions } from "../commands/preview.js";

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(raw) as unknown;
}

export async function handleCommentPost(
  req: IncomingMessage,
  res: ServerResponse,
  options: PreviewOptions,
): Promise<void> {
  try {
    const body = (await readJsonBody(req)) as Partial<Annotation> & {
      comment?: string;
    };

    if (!body.comment?.trim()) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "comment is required" }));
      return;
    }

    const id = body.id ?? createAnnotationId();
    const annotation: Annotation = {
      id,
      ts: body.ts ?? new Date().toISOString(),
      comment: body.comment.trim(),
      page: body.page ?? options.relativePage ?? "index.html",
      pageUrl: body.pageUrl ?? options.pageUrl ?? "/",
      root: body.root ?? options.rootLabel,
      element: body.element ?? "unknown",
      selector: body.selector ?? "unknown",
      path: body.path ?? "unknown",
      text: body.text ?? null,
      classes: body.classes ?? null,
      box: body.box ?? null,
      selectedText: body.selectedText ?? null,
      markdown: "",
    };

    annotation.markdown = formatAnnotationMarkdown(annotation);
    await appendAnnotation(annotation, options.inbox);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ id, ok: true }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: message }));
  }
}

export function getProcessedPath(inboxPath: string): string {
  if (inboxPath.endsWith("inbox.jsonl")) {
    return inboxPath.replace(/inbox\.jsonl$/, "processed.json");
  }
  return DEFAULT_PROCESSED_FILE;
}
