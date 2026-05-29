import path from "node:path";

import {
  DEFAULT_INBOX_FILE,
  markProcessed,
  processedPathForInbox,
} from "@comment-to-fix/core";

export type MarkProcessedOptions = {
  id: string;
  inbox: string;
};

export async function runMarkProcessed(options: MarkProcessedOptions): Promise<void> {
  const inbox = path.resolve(options.inbox ?? DEFAULT_INBOX_FILE);
  const processed = processedPathForInbox(inbox);
  await markProcessed(options.id, inbox, processed);
  process.stderr.write(`Marked processed: ${options.id}\n`);
}
