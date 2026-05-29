import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";

import { handleCommentPost } from "./api.js";
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
import {
  getProcessedAnnotationIds,
  inboxPathForPort,
  processedPathForInbox,
  readProcessedState,
} from "@comment-to-fix/core";

const MAX_PORT_ATTEMPTS = 50;

export type PreviewServerHandle = {
  url: string;
  port: number;
  inbox: string;
  close: () => void;
};

function sendText(res: ServerResponse, status: number, body: string, contentType = "text/plain; charset=utf-8"): void {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(body);
}

function sendBuffer(res: ServerResponse, status: number, body: Buffer, contentType: string): void {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(body);
}

function createPreviewHandler(
  rootDir: string,
  pageUrl: string,
  serverOptions: PreviewOptions,
  processedPath: string,
) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const method = req.method ?? "GET";
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${serverOptions.port}`);
    const pathname = url.pathname;

    try {
      if (method === "GET" && pathname === "/__ctf__/health") {
        sendText(res, 200, JSON.stringify({ ok: true }), "application/json");
        return;
      }

      if (method === "GET" && pathname === "/__ctf__/status") {
        const processedIds = await getProcessedAnnotationIds(serverOptions.inbox, processedPath);
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
  };
}

export function startPreviewServer(options: PreviewOptions): Promise<PreviewServerHandle> {
  const rootDir = path.resolve(options.root);
  const entryFile = path.resolve(options.file);
  const entryRelative = path.relative(rootDir, entryFile).split(path.sep).join("/");
  const pageUrl = `/${entryRelative}`;

  const stopWatcher = startFileWatcher(rootDir);

  return new Promise<PreviewServerHandle>((resolve, reject) => {
    let attempt = 0;

    const tryListen = (candidate: number): void => {
      const inbox = options.inbox ?? inboxPathForPort(candidate);
      const processedPath = processedPathForInbox(inbox);
      const serverOptions: PreviewOptions = {
        ...options,
        root: rootDir,
        rootLabel: options.rootLabel,
        relativePage: entryRelative,
        pageUrl,
        port: candidate,
        inbox,
      };

      // A fresh server per attempt: re-calling listen() on a server that
      // already emitted EADDRINUSE does not rebind to a new port.
      const server = createServer(
        createPreviewHandler(rootDir, pageUrl, serverOptions, processedPath),
      );

      const onError = (error: NodeJS.ErrnoException): void => {
        // `exclusive: true` makes a busy port fail with EADDRINUSE even on
        // macOS/BSD (where SO_REUSEADDR otherwise allows silent duplicate
        // binds), so retrying the next port is race-free across processes.
        if (
          error.code === "EADDRINUSE" &&
          attempt < MAX_PORT_ATTEMPTS - 1 &&
          candidate + 1 < 65536
        ) {
          attempt += 1;
          tryListen(candidate + 1);
          return;
        }
        stopWatcher();
        reject(error);
      };

      server.once("error", onError);
      server.listen({ port: candidate, host: "127.0.0.1", exclusive: true }, () => {
        server.removeListener("error", onError);

        const stopProcessedWatcher = startProcessedWatcher(inbox, processedPath);

        resolve({
          url: `http://127.0.0.1:${candidate}${pageUrl}`,
          port: candidate,
          inbox,
          close: () => {
            stopWatcher();
            stopProcessedWatcher();
            server.close();
          },
        });
      });
    };

    tryListen(options.port);
  });
}
