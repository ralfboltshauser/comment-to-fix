import path from "node:path";

import {
  DEFAULT_INBOX_FILE,
  DEFAULT_PROCESSED_FILE,
  markProcessed,
  waitForNextAnnotation,
} from "@comment-to-fix/core";

export type WatchOptions = {
  once: boolean;
  inbox: string;
};

function processedPathForInbox(inbox: string): string {
  if (inbox.endsWith("inbox.jsonl")) {
    return inbox.replace(/inbox\.jsonl$/, "processed.json");
  }
  return DEFAULT_PROCESSED_FILE;
}

export async function runWatch(options: WatchOptions): Promise<void> {
  const inbox = path.resolve(options.inbox);
  const processed = processedPathForInbox(inbox);

  process.stderr.write(`Watching ${inbox} for next comment…\n`);

  const annotation = await waitForNextAnnotation(inbox, processed);
  process.stdout.write(`${JSON.stringify(annotation)}\n`);
}
