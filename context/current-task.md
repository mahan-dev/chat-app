# current-task — The Single Active Task

**Task:** F6 — Polish
**Status:** not started
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

## Checklist (verify before marking done)

- [ ] No layout jumps or unstyled flashes
- [ ] Killing the server shows disconnected and restart recovers
- [ ] Every list has a sensible empty state
- [ ] `npm run build --prefix client` — clean

## On completion

Append entry to `done.md` → commit.
