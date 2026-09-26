# current-task — The Single Active Task

**Task:** F3 — Find people & conversations
**Status:** not started
**Spec:** see `features.md` → F3. Read `stack.md` and `architecture.md` before starting.

## Scope

- Server: `GET /api/users?q=` (username prefix search, max 10, excludes self and deleted), `POST /api/conversations` (get-or-create with `{username}`), `GET /api/conversations` (peer profile + last message, recent first)
- Client: `/chat` layout — sidebar with search box, results open a conversation; conversation list with peer avatar/name and last-message preview; selected conversation shows an empty message pane

## Out of scope

No websocket messaging yet. (That is F4.)

## Checklist (verify before marking done)

- [ ] Searching a username and picking a result opens a conversation
- [ ] Opening the same person twice reuses one conversation
- [ ] Sidebar lists conversations correctly
- [ ] `cd server && npx tsc --noEmit` — clean
- [ ] `npm run build --prefix client` — clean

## On completion

Append entry to `done.md` → load F4 into this file → commit.
