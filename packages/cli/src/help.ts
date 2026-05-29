export function printHelp(): void {
  console.log(`
comment-to-fix — Comment to Fix

Point at any HTML page, leave a comment, get the fix.

Usage:
  comment-to-fix [file.html] [options]       Preview HTML with overlay (default: ./index.html)
  comment-to-fix watch --once [options]      Wait for next annotation (agent loop)
  comment-to-fix mark-processed --id <id>    Mark annotation as processed
  comment-to-fix help                        Show this help

Preview options:
  --root <dir>       Asset root (default: directory of HTML file)
  --port <number>    Preview server port (default: 5173)
  --open             Open browser after starting
  --inbox <path>     Inbox file (default: .comment-to-fix/inbox.jsonl)

Watch options:
  --once             Block until one new annotation, print JSON, exit
  --inbox <path>     Inbox file (default: .comment-to-fix/inbox.jsonl)

Mark-processed options:
  --id <id>          Annotation id (required)
  --inbox <path>     Inbox file (default: .comment-to-fix/inbox.jsonl)

Examples:
  npx comment-to-fix
  npx comment-to-fix proposal.html --open
  npx comment-to-fix watch --once
  npx comment-to-fix mark-processed --id ann_7f2a
`.trim());
}
