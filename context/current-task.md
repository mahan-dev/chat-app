# current-task — The Single Active Task

**Task:** F4 — Realtime messaging
**Status:** not started
**Spec:** see `features.md` → F4. Read `stack.md` and `architecture.md` before starting.

## Scope

- Server: `sockets.ts` — JWT handshake auth, personal rooms `user:<id>`, `message:send` event with ack, `GET /api/conversations/:id/messages` (last 50, oldest first, participants only)
- Client: Socket.IO client singleton, message pane rendering history + live messages, send form, sidebar reordering / unknown conversation fetching on `message:new`

## Out of scope

Account deletion and polish features (F5-F6).

## Checklist (verify before marking done)

- [ ] Two browsers, two accounts: messages appear on both sides instantly
- [ ] History survives server restart
- [ ] Bad token cannot connect socket
- [ ] Messages from conversation X never render in conversation Y
- [ ] Recipient's sidebar shows brand-new conversation without refresh
- [ ] `cd server && npx tsc --noEmit` — clean
- [ ] `npm run build --prefix client` — clean

## On completion

Append entry to `done.md` → load F5 into this file → commit.
