import fs from "node:fs";
import path from "node:path";

import { DEFAULT_INBOX_FILE, DEFAULT_PREVIEW_PORT } from "@comment-to-fix/core";

import type { MarkProcessedOptions } from "./commands/mark-processed.js";
import type { PreviewOptions } from "./commands/preview.js";
import type { WatchOptions } from "./commands/watch.js";

const SUBCOMMANDS = new Set(["watch", "mark-processed", "help"]);

function readFlag(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1 || index + 1 >= args.length) return undefined;
  return args[index + 1];
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

function stripFlags(args: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith("--")) {
      if (["--root", "--port", "--inbox", "--id"].includes(arg)) {
        i++;
      }
      continue;
    }
    result.push(arg);
  }
  return result;
}

function parseSharedFlags(args: string[]): {
  flags: {
    root?: string;
    port: number;
    open: boolean;
    inbox?: string;
    id?: string;
    once: boolean;
  };
  rest: string[];
} {
  const portRaw = readFlag(args, "--port");
  const port = portRaw ? Number.parseInt(portRaw, 10) : DEFAULT_PREVIEW_PORT;
  if (!Number.isFinite(port) || port <= 0 || port >= 65536) {
    throw new Error(`Invalid --port value: ${portRaw}`);
  }

  return {
    flags: {
      root: readFlag(args, "--root") ?? undefined,
      port,
      open: hasFlag(args, "--open"),
      inbox: readFlag(args, "--inbox") ?? undefined,
      id: readFlag(args, "--id") ?? undefined,
      once: hasFlag(args, "--once"),
    },
    rest: stripFlags(args),
  };
}

export function isSubcommand(value: string | undefined): boolean {
  return value !== undefined && SUBCOMMANDS.has(value);
}

export function parsePreviewArgs(args: string[]): PreviewOptions {
  const { flags, rest } = parseSharedFlags(args);
  const fileArg = rest[0] ?? "index.html";
  const file = path.resolve(process.cwd(), fileArg);

  if (!fs.existsSync(file)) {
    throw new Error(`HTML file not found: ${file}`);
  }

  const root = flags.root
    ? path.resolve(process.cwd(), flags.root)
    : path.dirname(file);

  return {
    file,
    root,
    rootLabel: path.relative(process.cwd(), root) || ".",
    port: flags.port,
    open: flags.open,
    inbox: flags.inbox,
  };
}

export function parseWatchArgs(args: string[]): WatchOptions {
  const { flags } = parseSharedFlags(args);
  if (!flags.once) {
    throw new Error("watch requires --once");
  }

  return {
    once: true,
    inbox: flags.inbox ?? DEFAULT_INBOX_FILE,
  };
}

export function parseMarkProcessedArgs(args: string[]): MarkProcessedOptions {
  const { flags } = parseSharedFlags(args);
  const id = flags.id;
  if (!id) {
    throw new Error("mark-processed requires --id <id>");
  }

  return {
    id,
    inbox: flags.inbox ?? DEFAULT_INBOX_FILE,
  };
}
