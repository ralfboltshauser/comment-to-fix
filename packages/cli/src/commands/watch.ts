import path from "node:path";

import {
  processedPathForInbox,
  waitForNextAnnotation,
} from "@comment-to-fix/core";

export type WatchOptions = {
  once: boolean;
  inbox: string;
};

export async function runWatch(options: WatchOptions): Promise<void> {
  const inbox = path.resolve(options.inbox);
  const processed = processedPathForInbox(inbox);

  process.stderr.write(`Watching ${inbox} for next comment…\n`);

  const annotation = await waitForNextAnnotation(inbox, processed);
  process.stdout.write(`${JSON.stringify(annotation)}\n`);
}
