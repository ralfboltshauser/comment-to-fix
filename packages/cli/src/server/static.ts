import fs from "node:fs";
import path from "node:path";

import chokidar from "chokidar";

import { broadcastFileChange } from "./live-reload.js";

export function startFileWatcher(rootDir: string): () => void {
  const watcher = chokidar.watch(rootDir, {
    ignoreInitial: true,
    ignored: [
      /(^|[\\/])\../,
      "**/node_modules/**",
      "**/.comment-to-fix/**",
    ],
  });

  const reloadExtensions = new Set([".html", ".css", ".js"]);

  const onChange = (filePath: string) => {
    const ext = path.extname(filePath).toLowerCase();
    if (!reloadExtensions.has(ext)) return;
    const relativePath = path.relative(rootDir, filePath).split(path.sep).join("/");
    const kind: "css" | "html" | "js" =
      ext === ".css" ? "css" : ext === ".html" ? "html" : "js";
    broadcastFileChange({ kind, path: relativePath });
  };

  watcher.on("add", onChange);
  watcher.on("change", onChange);

  return () => {
    void watcher.close();
  };
}

export function resolveSafePath(rootDir: string, requestPath: string): string | null {
  const decoded = decodeURIComponent(requestPath.split("?")[0] ?? requestPath);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const resolved = path.resolve(rootDir, normalized.startsWith("/") ? normalized.slice(1) : normalized);
  const relative = path.relative(rootDir, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }

  return resolved;
}

export function readStaticFile(filePath: string): Buffer | null {
  try {
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
}

export function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".woff2":
      return "font/woff2";
    case ".woff":
      return "font/woff";
    default:
      return "application/octet-stream";
  }
}
