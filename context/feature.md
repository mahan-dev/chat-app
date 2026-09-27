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

## F2 — Profile

- Server: `PATCH /api/me` (first_name, last_name, bio; validation per
  contract; `GET /api/me` already shipped in F1)
- Client: `/profile` page — view + edit form with save feedback; `Avatar`
  component (initials + deterministic color derived from username, see
  architecture.md); display-name rule: "First Last" if set, else username

**Acceptance:** edits survive reload; over-long fields rejected with the
server's message; avatar shows correct initials everywhere a user appears.

## F3 — Find people & conversations

- Server: `GET /api/users?q=` (username prefix search, max 10, excludes self
  and deleted), `POST /api/conversations` (get-or-create with `{username}`),
  `GET /api/conversations` (peer profile + last message, recent first)
- Client: `/chat` layout — sidebar with search box, results open a
  conversation; conversation list with peer avatar/name and last-message
  preview; selected conversation shows an empty message pane (F4 fills it)

**Acceptance:** searching a username and picking a result opens a
conversation; opening the same person twice reuses one conversation; the
sidebar lists it; a second account sees the conversation only once a message
exists (F4 completes this).

## F4 — Realtime messaging

- Server: `sockets.ts` — JWT handshake auth; every socket joins its personal
  room `user:<id>`; `message:send` (validate → INSERT → emit `message:new` to
  both participants) with an ack reporting success or error;
  `GET /api/conversations/:id/messages` (last 50, oldest first, participants only)
- Client: socket singleton (connects after login, closes on logout); message
  pane renders history + live messages (sender name, content, local-time
  stamp); send form; `message:new` also bumps/reorders the sidebar and
  refetches the list when the conversation is unknown; reconnect recovers

**Acceptance:** two browsers, two accounts: messages appear on both sides
instantly; history survives server restart; a bad token can't connect a
socket; messages from conversation X never render in conversation Y; the
recipient's sidebar shows a brand-new conversation without a refresh.

## F5 — Delete account

- Server: `DELETE /api/me` requiring `{password}`; in one transaction:
  username → `deleted#<id>`, profile fields blanked, `password_hash` cleared,
  `deleted_at` set; then disconnect that user's sockets; `message:send` to a
  conversation whose peer is deleted acks an error
- Client: danger zone on `/profile` — type-password-to-confirm dialog; on
  success clear storage → `/login`; deleted peers render as "Deleted User"
  with a disabled message input

**Acceptance:** deleted account can't log in and its old JWT gets 401; the
other user still sees the full conversation, attributed to "Deleted User",
and cannot send to it; no profile data of the deleted user survives in the DB.

## F6 — Polish

Infinite scroll in user lists and chat page including pagination for fetching users and conversations messages , Auto-scroll (only when already at bottom), empty states (no conversations, no
messages, no search results), loading states, connection-status indicator,
failed-send feedback, consistent Tailwind pass, usable at 375px width.

**Acceptance:** no layout jumps or unstyled flashes; killing the server shows
disconnected and restart recovers; every list has a sensible empty state.

---

## Later (do not build without promoting to a numbered feature first)

Typing indicator · online presence · unread badges · history pagination ·
avatar image upload · blocking users · rate limiting · group chats ·
httpOnly-cookie auth (required before any deployment)
