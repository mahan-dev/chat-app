# current-task — The Single Active Task

**Task:** F1 — Auth
**Status:** completed
**Spec:** see `features.md` → F1. Read `stack.md` and `architecture.md` before starting.

## Scope

- Server: `POST /api/auth/signup`, `POST /api/auth/login`, `requireAuth` middleware, `GET /api/me`
- Client: `/signup` and `/login` pages, `lib/api.ts` fetch wrapper, root page redirect, logout button

## Out of scope

No messaging, no conversation creation, no socket code yet. (Those are F2-F4.)

## Checklist (verify before marking done)

- [x] Sign up, log out, log back in from the browser
- [x] Duplicate username and wrong password show friendly errors
- [x] `GET /api/me` without token returns 401, with token returns profile
- [x] Reload keeps user logged in
- [x] `cd server && npx tsc --noEmit` — clean
- [x] `npm run build --prefix client` — clean

## On completion

F1 completed and verified.
