import path from "node:path";

import {
  DEFAULT_INBOX_FILE,
  DEFAULT_PROCESSED_FILE,
  markProcessed,
} from "@comment-to-fix/core";

export type MarkProcessedOptions = {
  id: string;
  inbox: string;
};

function processedPathForInbox(inbox: string): string {
  if (inbox.endsWith("inbox.jsonl")) {
    return inbox.replace(/inbox\.jsonl$/, "processed.json");
  }
  return DEFAULT_PROCESSED_FILE;
}

export async function runMarkProcessed(options: MarkProcessedOptions): Promise<void> {
  const inbox = path.resolve(options.inbox ?? DEFAULT_INBOX_FILE);
  const processed = processedPathForInbox(inbox);
  await markProcessed(options.id, inbox, processed);
  process.stderr.write(`Marked processed: ${options.id}\n`);
}
