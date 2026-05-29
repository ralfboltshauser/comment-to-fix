import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";

import { handleCommentPost, getProcessedPath } from "./api.js";
import { assetExists, readAsset } from "./assets.js";
import { injectHtml } from "./inject.js";
import { LIVE_RELOAD_CLIENT } from "./inject.js";
import { handleEventsRequest } from "./live-reload.js";
import { startProcessedWatcher } from "./processed-watcher.js";
import {
  getContentType,
  readStaticFile,
  resolveSafePath,
  startFileWatcher,
} from "./static.js";
import type { PreviewOptions } from "../commands/preview.js";
import { getProcessedAnnotationIds, readProcessedState } from "@comment-to-fix/core";

function sendText(res: ServerResponse, status: number, body: string, contentType = "text/plain; charset=utf-8"): void {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(body);
}

function sendBuffer(res: ServerResponse, status: number, body: Buffer, contentType: string): void {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(body);
}

export function startPreviewServer(options: PreviewOptions): Promise<{ url: string; close: () => void }> {
  const rootDir = path.resolve(options.root);
  const entryFile = path.resolve(options.file);
  const entryRelative = path.relative(rootDir, entryFile).split(path.sep).join("/");
  const pageUrl = `/${entryRelative}`;

  const serverOptions: PreviewOptions = {
    ...options,
    root: rootDir,
    rootLabel: options.rootLabel,
    relativePage: entryRelative,
    pageUrl,
  };

  const stopWatcher = startFileWatcher(rootDir);
  const processedPath = getProcessedPath(options.inbox);
  const stopProcessedWatcher = startProcessedWatcher(options.inbox, processedPath);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const method = req.method ?? "GET";
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${options.port}`);
    const pathname = url.pathname;

    try {
      if (method === "GET" && pathname === "/__ctf__/health") {
        sendText(res, 200, JSON.stringify({ ok: true }), "application/json");
        return;
      }

      if (method === "GET" && pathname === "/__ctf__/status") {
        const processedIds = await getProcessedAnnotationIds(options.inbox, processedPath);
        const state = await readProcessedState(processedPath);
        sendText(
          res,
          200,
          JSON.stringify({ processedIds, lastId: state.lastId }),
          "application/json",
        );
        return;
      }

      if (method === "GET" && pathname === "/__ctf__/events") {
        handleEventsRequest(res);
        return;
      }

      if (method === "GET" && pathname === "/__ctf__/live.js") {
        sendText(res, 200, LIVE_RELOAD_CLIENT, "text/javascript; charset=utf-8");
        return;
      }

      if (method === "GET" && pathname === "/__ctf__/overlay.js") {
        if (!assetExists("overlay.js")) {
          sendText(res, 500, "overlay.js not found — run pnpm build");
          return;
        }
        sendText(res, 200, readAsset("overlay.js"), "text/javascript; charset=utf-8");
        return;
      }

      if (method === "POST" && pathname === "/__ctf__/comment") {
        await handleCommentPost(req, res, serverOptions);
        return;
      }

      if (method !== "GET" && method !== "HEAD") {
        sendText(res, 405, "Method Not Allowed");
        return;
      }

      let requestPath = pathname;
      if (requestPath === "/") {
        requestPath = pageUrl;
      }

      const safePath = resolveSafePath(rootDir, requestPath);
      if (!safePath) {
        sendText(res, 403, "Forbidden");
        return;
      }

      const fileBuffer = readStaticFile(safePath);
      if (!fileBuffer) {
        sendText(res, 404, "Not Found");
        return;
      }

      const contentType = getContentType(safePath);
      if (safePath.endsWith(".html")) {
        const html = injectHtml(fileBuffer.toString("utf8"), serverOptions.rootLabel);
        sendText(res, 200, html, contentType);
        return;
      }

      sendBuffer(res, 200, fileBuffer, contentType);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendText(res, 500, message);
    }
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, "127.0.0.1", () => {
      const url = `http://127.0.0.1:${options.port}${pageUrl}`;
      resolve({
        url,
        close: () => {
          stopWatcher();
          stopProcessedWatcher();
          server.close();
        },
      });
    });
  });
}
