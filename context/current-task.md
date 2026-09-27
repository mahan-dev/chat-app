# current-task — The Single Active Task

**Task:** F6 — Polish
**Status:** completed
**Spec:** see `features.md` → F6. Read `stack.md` and `architecture.md` before starting.

## Scope

- Auto-scroll (only when already at bottom)
- Empty states (no conversations, no messages, no search results)
- Loading states
- Connection-status indicator
- Failed-send feedback
- Consistent Tailwind pass
- Usable at 375px width

## Out of scope

Later features.

## Checklist (verified)

- [x] No layout jumps or unstyled flashes
- [x] Killing the server shows disconnected and restart recovers
- [x] Every list has a sensible empty state
- [x] `npm run build --prefix client` — clean
