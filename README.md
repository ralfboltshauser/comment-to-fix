# Comment to Fix

[![Install with skills](https://skills.sh/b/ralfboltshauser/comment-to-fix)](https://skills.sh/ralfboltshauser/comment-to-fix)

**Comment to fix.** Point at any HTML page, leave a comment, get the fix.

Monorepo for the Comment to Fix CLI, browser overlay, agent skill, and plain HTML landing page.

## Packages

| Package | Description |
|---------|-------------|
| `comment-to-fix` | Published CLI (`npx comment-to-fix`) |
| `@comment-to-fix/core` | Shared types, inbox NDJSON utilities, element capture |
| `@comment-to-fix/overlay` | Browser overlay bundle (embedded in CLI) |

## Quick start

```bash
pnpm install
pnpm build
pnpm dev:landing
```

Or run directly:

```bash
npx comment-to-fix apps/landing/index.html --root apps/landing --open
pnpm dlx comment-to-fix ./index.html --open
bunx comment-to-fix proposal.html --open
```

Defaults to `./index.html` in the current directory.

## Agent loop

Install the skill:

```bash
npx skills add ralfboltshauser/comment-to-fix
```

Then in your agent:

```text
/comment-to-fix
```

The agent starts preview mode, then loops:

```bash
npx comment-to-fix watch --once
# implement fix
npx comment-to-fix mark-processed --id ann_xxx
```

Until you say stop.

## CLI commands

```bash
comment-to-fix [file.html] [--root dir] [--port 5173] [--open]
comment-to-fix watch --once
comment-to-fix mark-processed --id ann_xxx
comment-to-fix help
```

Annotations append to `.comment-to-fix/inbox.jsonl`.

## Development

```bash
pnpm build
pnpm test
pnpm dev:landing
```

## Publish

```bash
pnpm --filter comment-to-fix publish --access public
```

The CLI is bundled with esbuild into a single self-contained `dist/index.js`
(the `@comment-to-fix/core` workspace package is inlined; only `chokidar` is an
external runtime dependency). The published package ships `dist/`, including the
bundled overlay at `dist/assets/overlay.js`.

## License

MIT
