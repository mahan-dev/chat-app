# current-task — The Single Active Task

**Task:** F5 — Delete account
**Status:** not started
**Spec:** see `features.md` → F5. Read `stack.md` and `architecture.md` before starting.

## Scope

- Server: `DELETE /api/me` requiring `{password}`; transaction: anonymize user (`deleted#<id>`, blank profile fields, clear password_hash, set deleted_at), disconnect user sockets, `message:send` validation rejecting messages to/from deleted users.
- Client: Danger zone on `/profile` — type-password-to-confirm dialog; on success clear storage → `/login`; deleted peers render as "Deleted User" with disabled message input.

## Out of scope

Polish features (F6).

## Checklist (verify before marking done)

- [ ] Deleted account cannot log in and old JWT gets 401
- [ ] Other user sees full conversation, attributed to "Deleted User", and cannot send to it
- [ ] No profile data of deleted user survives in DB
- [ ] `cd server && npx tsc --noEmit` — clean
- [ ] `npm run build --prefix client` — clean

## On completion

Append entry to `done.md` → load F6 into this file → commit.
