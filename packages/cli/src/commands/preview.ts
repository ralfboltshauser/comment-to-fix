import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { startPreviewServer } from "../server/preview-server.js";

const execFileAsync = promisify(execFile);

export type PreviewOptions = {
  file: string;
  root: string;
  rootLabel: string;
  port: number;
  open: boolean;
  /** Explicit inbox path; when omitted the server derives one from the bound port. */
  inbox?: string;
  relativePage?: string;
  pageUrl?: string;
};

async function openBrowser(url: string): Promise<void> {
  const platform = process.platform;
  try {
    if (platform === "darwin") {
      await execFileAsync("open", [url]);
    } else if (platform === "win32") {
      await execFileAsync("cmd", ["/c", "start", "", url]);
    } else {
      await execFileAsync("xdg-open", [url]);
    }
  } catch {
    console.error(`Open in browser: ${url}`);
  }
}

export async function runPreview(options: PreviewOptions): Promise<void> {
  const file = path.resolve(options.file);
  const root = path.resolve(options.root);

  if (!fs.existsSync(file)) {
    throw new Error(`HTML file not found: ${file}`);
  }

  if (!fs.existsSync(root)) {
    throw new Error(`Root directory not found: ${root}`);
  }

  const relative = path.relative(root, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`HTML file must be inside root directory (${root})`);
  }

  const { url, port, inbox, close } = await startPreviewServer({
    ...options,
    file,
    root,
  });

  console.error(`Comment to Fix preview: ${url}`);
  console.error(`Port: ${port}`);
  console.error(`Inbox: ${path.resolve(inbox)}`);
  if (port !== options.port) {
    console.error(
      `(port ${options.port} was busy — bound to ${port} for this parallel session)`,
    );
  }
  console.error("Press Ctrl+C to stop.");

  if (options.open) {
    await openBrowser(url);
  }

  const shutdown = () => {
    close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await new Promise<void>(() => {});
}
