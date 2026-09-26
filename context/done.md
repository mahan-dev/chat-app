# Done

- **F0 - Scaffolding**: Monorepo skeleton, Next.js client, Express server with SQLite schema initialization, and root README.
- **F1 — Auth**: Server endpoints (`POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/me`), `requireAuth` middleware, JWT authentication, client signup & login pages, `lib/api.ts` fetch wrapper, root redirect, and logout button.
- **F2 — Profile**: Server endpoint (`PATCH /api/me`), reusable `Avatar` component with deterministic color hashing and initials, display-name helper rule ("First Last" or username), and `/profile` page with view & edit form and save feedback.
- **F3 — Find people & conversations**: Server endpoints (`GET /api/users?q=`, `POST /api/conversations`, `GET /api/conversations`), canonical pair ordering (`user_a < user_b`), and `/chat` sidebar layout with prefix user search, get-or-create conversation handling, conversation summary list, and active conversation selection.
