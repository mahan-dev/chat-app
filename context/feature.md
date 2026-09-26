# Features

Feature will be in this order , each one is a vertical slice that ends
runnable and verified. The active feature is copied into current-task.md

## F0 - Scaffolding

Monorepo skeleton, nothing user-visible yet.

- "client": create-next-app (typescript, tailwind,appRouter, eslint, npm)
- "server": hand-written typescript express app - GET /api/health , db.ts
  that open SQLite and creates the full schema from architecture.md
  -Root README.MD with run instructions
  **Acceptance:** both dev servers run; health endpoint answers `{"ok":true}`;
`chat.db` appears on first server start with all tables; both apps type-check.


## F1 — Auth

- Server: `POST /api/auth/signup`, `POST /api/auth/login` (bcrypt, JWT 7-day
  expiry), `requireAuth` middleware = valid JWT **and** user not deleted;
  `GET /api/me` — the first protected route, returns the caller's UserProfile
- Client: `/signup` and `/login` pages with inline server errors; token + user
  in localStorage; `lib/api.ts` fetch wrapper attaching the header; root page
  redirects (token → `/chat`, none → `/login`); logout button (clears storage)

**Acceptance:** sign up, log out, log back in from the browser; duplicate
username and wrong password show friendly errors; `GET /api/me` without a
token returns 401 and with a token returns the profile; reload keeps you
logged in.
