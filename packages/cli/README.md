# comment-to-fix

**Point at any HTML page, leave a comment, get the fix.**

`comment-to-fix` serves your HTML with a browser overlay. Click any element,
type a comment, and it's appended to a local inbox (`.comment-to-fix/inbox.jsonl`)
that your coding agent reads, fixes, and marks processed — with live reload and
per-comment lifecycle markers (fixing → ready).

## Quick start

```bash
npx comment-to-fix ./index.html --open
pnpm dlx comment-to-fix apps/landing/index.html --root apps/landing --open
bunx comment-to-fix proposal.html --open
```

Defaults to `./index.html` in the current directory.

## Agent loop

```bash
npx comment-to-fix watch --once       # block until the next comment, print JSON
# ...implement the fix...
npx comment-to-fix mark-processed --id ann_xxx
```

## Commands

```bash
comment-to-fix [file.html] [--root dir] [--port 5173] [--open]
comment-to-fix watch --once
comment-to-fix mark-processed --id ann_xxx
comment-to-fix help
```

## License

MIT
