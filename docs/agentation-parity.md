# Agentation Parity Checklist

Track UX parity with Agentation feedback mode (not layout/MCP).

## Toolbar

- [x] Collapsed icon with annotation count badge
- [x] Expanded controls on activate
- [x] Draggable toolbar with position persistence
- [x] Pause animations (P)
- [x] Hide/show markers (H)
- [x] Copy all markdown (C)
- [x] Clear all (X)
- [x] Settings panel
- [x] Exit (Esc)
- [x] Cmd/Ctrl+Shift+F toggle mode

## Annotation modes

- [x] Element click
- [x] Text selection (click with selection + selection chip)
- [x] Multi-select (Cmd+Shift+click, release to confirm)
- [x] Area drag (empty region >20px)
- [x] Animation pause before annotating

## Comment popup

- [x] Anchored to marker (not cursor)
- [x] Viewport flip above/below
- [x] Collapsible computed styles
- [x] Selected text quote block
- [x] Enter to submit, Shift+Enter newline, Esc cancel
- [x] Shake on outside click (no draft loss)
- [x] Disabled submit until non-empty
- [x] Edit mode with Save + Delete

## Markers

- [x] Numbered pins (blue single, green multi)
- [x] Fixed vs scroll layers
- [x] Hover tooltip with element + comment
- [x] Hover re-highlight of target element(s)
- [x] Click edit / delete (setting)
- [x] Right-click edit
- [x] Persist per page (7 day TTL)
- [x] Enter/exit animations

## Output

- [x] Immediate POST send on submit (CLI inbox)
- [x] Copy-all with detail levels
- [x] Auto-clear after copy/send (settings)

## Settings

- [x] Output detail cycle
- [x] Marker color picker
- [x] Dark/light theme
- [x] Block page interactions
- [x] Marker click behavior

## Polish

- [x] CSS micro-interactions (toolbar, popup, markers)
- [x] Host page CSS isolation for portaled UI
- [x] Expanded test fixture
- [x] Core unit tests
