import { runMarkProcessed } from "./commands/mark-processed.js";
import { runPreview } from "./commands/preview.js";
import { runWatch } from "./commands/watch.js";
import { printHelp } from "./help.js";
import {
  isSubcommand,
  parseMarkProcessedArgs,
  parsePreviewArgs,
  parseWatchArgs,
} from "./parse-args.js";

async function main(): Promise<void> {
  const [, , firstArg, ...restArgs] = process.argv;

  try {
    if (firstArg === "watch") {
      await runWatch(parseWatchArgs(restArgs));
      return;
    }

    if (firstArg === "mark-processed") {
      await runMarkProcessed(parseMarkProcessedArgs(restArgs));
      return;
    }

    if (
      firstArg === "help" ||
      firstArg === "--help" ||
      firstArg === "-h" ||
      firstArg === undefined
    ) {
      printHelp();
      return;
    }

    if (isSubcommand(firstArg)) {
      console.error(`Unhandled subcommand: ${firstArg}`);
      process.exit(1);
    }

    const previewArgs = firstArg.startsWith("-")
      ? [firstArg, ...restArgs]
      : [firstArg, ...restArgs];

    await runPreview(parsePreviewArgs(previewArgs));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`comment-to-fix: ${message}`);
    process.exit(1);
  }
}

main();
