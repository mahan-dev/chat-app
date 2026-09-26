# current-task — The Single Active Task

**Task:** F1 — Auth
**Status:** not started
**Spec:** see `features.md` → F1. Read `stack.md` and `architecture.md` before starting.

## Scope

- Server: `POST /api/auth/signup`, `POST /api/auth/login`, `requireAuth` middleware, `GET /api/me`
- Client: `/signup` and `/login` pages, `lib/api.ts` fetch wrapper, root page redirect, logout button

## Out of scope

No messaging, no conversation creation, no socket code yet. (Those are F2-F4.)

## Checklist (verify before marking done)

- [ ] Sign up, log out, log back in from the browser
- [ ] Duplicate username and wrong password show friendly errors
- [ ] `GET /api/me` without token returns 401, with token returns profile
- [ ] Reload keeps user logged in
- [ ] `cd server && npx tsc --noEmit` — clean
- [ ] `npm run build --prefix client` — clean

## On completion

Append entry to `done.md` → load F2 into this file → commit.
