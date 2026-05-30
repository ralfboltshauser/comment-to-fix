---
name: comment-to-fix
description: Start Comment to Fix on HTML — preview with overlay, watch annotations, fix in a loop until stopped. Use when the user runs /comment-to-fix or wants to review HTML slides, proposals, or landing pages with live agent fixes.
disable-model-invocation: true
---

# Comment to Fix

Comment to Fix — point at HTML, comment, get the fix.

Use this skill when the user wants to review an HTML slide, proposal, landing page, or static site section and have you implement changes in a continuous loop.

## Install (once per machine)

```bash
npx skills add ralfboltshauser/comment-to-fix
```

The CLI itself runs via:

```bash
npx comment-to-fix [file.html] [--open]
pnpm dlx comment-to-fix [file.html] [--open]
bunx comment-to-fix [file.html] [--open]
```

Defaults to `./index.html` in the current working directory.

## When the user runs `/comment-to-fix`

## Non-negotiable behavior

Running this skill means opening the preview **and then attaching to the Comment to Fix CLI inbox with `watch --once`**. The agent must not finish the turn just because the preview opened.

- After the preview starts, immediately run `npx comment-to-fix watch --once --inbox <inbox>` using the exact `Inbox` path printed by the preview.
- `watch --once` is expected to hang while it waits for the next sent comment. Leave it running and keep the session attached.
- After every fix and `mark-processed`, immediately start a fresh `watch --once --inbox <inbox>` unless the user explicitly says stop / done / exit comment to fix.
- A Comment to Fix session is only complete when the user explicitly stops it or the preview/watch process cannot be started.

### 1. Resolve the HTML entry file

- Use the path the user provided, otherwise `./index.html` in the project root
- If missing, stop with a clear error

### 2. Ensure inbox is gitignored

Add `.comment-to-fix/` to `.gitignore` if it is not already ignored.

### 3. Start preview in a background terminal

```bash
npx comment-to-fix [file.html] --open
```

Use `pnpm dlx` or `bunx` only if the user explicitly prefers that package manager. Default to `npx` for compatibility.

**Read the preview output before continuing.** It prints three lines you must capture for this session:

```
Comment to Fix preview: http://127.0.0.1:5174/index.html
Port: 5174
Inbox: /abs/path/.comment-to-fix/inbox-5174.jsonl
```

- The port auto-increments when a port is busy, so **never assume 5173** — use the URL it printed.
- The `Inbox` path is **port-scoped** so multiple Comment to Fix sessions run in parallel without colliding. Remember this exact path and pass it as `--inbox <inbox>` to every `watch` and `mark-processed` call in this session.

Tell the user:

> Comment to Fix is open. Click the comment button (bottom-right) to enter feedback mode, then point at anything and leave a comment. Use **Copy** (C) to copy all feedback as markdown, or **Send** on each comment for the agent loop. Say **stop** when you're done.

### Overlay shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+Shift+F` | Toggle feedback mode |
| `P` | Pause/resume animations |
| `H` | Hide/show markers |
| `L` | Toggle comment history |
| `C` | Copy all feedback |
| `X` | Clear all |
| `Esc` | Exit mode / cancel popup |
| `Enter` | Submit comment (in popup) |

**Annotation modes:** click element, select text then click (or use selection chip), Cmd+Shift+click multi-select, drag area on empty space, pause animations first for motion states.

### Marker lifecycle (after Send)

When a comment is **sent** (not just copied), markers show async progress:

| Marker | Meaning |
|--------|---------|
| Spinner | Agent has not marked this comment processed yet |
| Green eye | Agent ran `mark-processed` — fix is ready |
| Hidden | User dismissed the marker (still listed in history) |

- **Green eye click** reloads the page to apply deferred HTML/JS fixes (dismisses all ready markers). CSS-only fixes may already be visible via hot reload.
- **Dismiss (×)** hides the marker without deleting it from history.
- Lifecycle requires **Clear after send** to stay off in overlay settings.

### Comment history

The toolbar **History** button (list icon) opens all comments for the **current page**. Click a row to scroll to that element and highlight it.

When implementing fixes, always run `mark-processed` after the change — that turns the marker green so the user knows the agent finished.

### 4. Watch loop — do not stop after one fix

Repeat until the user explicitly says stop / done / exit comment to fix:

1. Run (use the `Inbox` path from step 3):
   ```bash
   npx comment-to-fix watch --once --inbox <inbox>
   ```
2. Parse the JSON line printed to stdout
3. Implement the smallest correct fix in files under `annotation.root` using:
   - `annotation.comment`
   - `annotation.selector`
   - `annotation.path`
   - `annotation.text`
   - `annotation.page`
4. Run:
   ```bash
   npx comment-to-fix mark-processed --id <annotation.id> --inbox <inbox>
   ```
5. Reply briefly with what changed and: **Waiting for your next comment…**
6. Go back to step 1

> For the default session (port 5173) the `--inbox` flag is optional — it defaults to `.comment-to-fix/inbox.jsonl`. Always pass it when running parallel sessions so each loop reads its own inbox.

**Critical rules:**

- Starting the preview alone is incomplete — always attach to the CLI watcher with `watch --once`
- Never treat a single annotation as task completion
- Never poll `.comment-to-fix/inbox.jsonl` manually — always use `watch --once`
- After each fix, immediately run `watch --once` again unless the user interrupted
- Prefer grep/search using `selector`, classes, and visible text in `annotation.root`

### 5. Teardown when the user says stop

1. Kill the background preview process
2. Summarize what was changed in the session
3. Do not keep calling `watch --once`

## Annotation payload shape

Each `watch --once` prints one JSON object like:

```json
{
  "id": "ann_abc123",
  "comment": "Make the hero headline shorter",
  "page": "apps/landing/index.html",
  "root": "apps/landing",
  "selector": "h1",
  "path": "main > section.hero > h1",
  "text": "Tell your page what should change",
  "markdown": "..."
}
```

Use `markdown` for the human-readable brief if helpful.

## Live reload

The preview server reloads when HTML/CSS/JS files change under the served root. **During feedback mode**, full page reloads are deferred so you don't lose scroll position or a comment in progress — CSS updates apply silently; HTML/JS changes apply when the user clicks a **green eye** marker or presses **Esc** to exit feedback mode. After you implement a fix, the user should see CSS changes immediately and structural changes after reload (via green eye or exit).

## Troubleshooting

- **No overlay:** run `npx comment-to-fix --help` and ensure the preview process is still running
- **Missing index.html:** ask the user which HTML file to preview or create one
- **watch hangs:** that is expected — it waits for the next comment
