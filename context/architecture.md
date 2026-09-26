# architecture — System Design, Data Model, API Contract

## System overview

```
┌─────────────────────┐          REST (fetch)           ┌──────────────────────────┐
│  client/            │  ─────────────────────────────► │  server/                 │
│  Next.js App Router │   auth, profile, search,        │  Express + Socket.IO     │
│  TypeScript         │   conversations, history        │  TypeScript              │
│  Tailwind           │                                 │                          │
│  localhost:3000     │  ◄────────────────────────────► │  localhost:4000          │
└─────────────────────┘    WebSocket: send/receive      └────────────┬─────────────┘
                                                                     │ better-sqlite3
                                                                     ▼
                                                              server/chat.db
```

Two independent Node processes. Next.js is UI-only: no data, no business
logic. Express owns the database, validation, and realtime fan-out.

**Division of labor:** REST for request/response (auth, profile, search,
conversation management, history). Socket.IO only for what must be *pushed*:
new messages.

**Socket routing model:** there are no per-conversation rooms to join. On
connection, each socket joins one personal room, `user:<id>`. Delivering a
message = emit to `user:<senderId>` and `user:<peerId>`. The client decides
what to do with it: append (conversation open) or bump the sidebar (not open).
This avoids join/leave choreography entirely and makes multi-tab work for free.

## Folder layout

```
pro/
├── CLAUDE.md
├── docs/
├── client/
│   ├── app/
│   │   ├── page.tsx           # redirect: token → /chat, else /login
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── profile/page.tsx   # edit profile + danger zone (delete account)
│   │   └── chat/page.tsx      # sidebar (search + conversations) + message pane
│   ├── components/            # Avatar, MessageList, Sidebar, ...
│   ├── lib/
│   │   ├── api.ts             # fetch wrapper: base URL, auth header, error handling
│   │   ├── auth.ts            # token/user persistence (localStorage)
│   │   ├── socket.ts          # Socket.IO client singleton
│   │   └── types.ts           # mirror of §API contract
│   └── .env.local
└── server/
    ├── src/
    │   ├── index.ts           # Express app + HTTP server + Socket.IO wiring
    │   ├── db.ts              # opens SQLite, creates schema
    │   ├── auth.ts            # signup/login, JWT sign/verify, requireAuth
    │   ├── users.ts           # /api/me (get/patch/delete), /api/users search
    │   ├── conversations.ts   # conversation routes + message history
    │   ├── sockets.ts         # handshake auth, user rooms, message:send
    │   └── types.ts           # mirror of §API contract
    ├── chat.db                # gitignored
    └── .env                   # gitignored; see stack.md
```

## Data model (SQLite)

`db.ts` runs this on startup; a fresh clone boots with zero setup. Deleting
`chat.db*` resets all data. No migration tooling until the schema first needs
to change after real data exists.

```sql
PRAGMA journal_mode = WAL;   -- readers don't block the writer
PRAGMA foreign_keys = ON;    -- SQLite defaults this OFF

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT    NOT NULL,
  first_name    TEXT    NOT NULL DEFAULT '',
  last_name     TEXT    NOT NULL DEFAULT '',
  bio           TEXT    NOT NULL DEFAULT '',
  deleted_at    TEXT,             -- NULL = active account
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conversations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_a     INTEGER NOT NULL REFERENCES users(id),
  user_b     INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_a, user_b),
  CHECK (user_a < user_b)   -- canonical order: one row per pair, ever
);

CREATE TABLE IF NOT EXISTS messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       INTEGER NOT NULL REFERENCES users(id),
  content         TEXT    NOT NULL,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, id);
CREATE INDEX IF NOT EXISTS idx_conversations_a ON conversations(user_a);
CREATE INDEX IF NOT EXISTS idx_conversations_b ON conversations(user_b);
```

Schema reasoning:

- **`CHECK (user_a < user_b)`** — a conversation between users 3 and 7 is
  always stored as `(3, 7)`, so `UNIQUE (user_a, user_b)` guarantees one
  conversation per pair. Lookup always normalizes the pair before querying.
- **Account deletion = anonymization, not row deletion.** Messages keep a
  valid `sender_id` forever. Deleting sets `deleted_at`, renames the user to
  `deleted#<id>`, blanks profile fields, and clears `password_hash`. The `#`
  is deliberate: it's outside the username alphabet (`[a-zA-Z0-9_]`), so the
  anonymized name can never collide with a name a real user could register.
- **`COLLATE NOCASE`** — "Milad" and "milad" are one identity; display keeps
  the original casing.
- **`created_at` as TEXT** — `datetime('now')` yields UTC
  `YYYY-MM-DD HH:MM:SS`, which sorts correctly as a string.
- **`idx_messages_conversation`** serves the hot query: last 50 messages of a
  conversation.

## API contract

**This section is the source of truth for every shape crossing the
client/server boundary.** Both `types.ts` files mirror it; if code disagrees
with this section, one of them is wrong — fix in the same commit.

### Shared types

```ts
interface UserProfile {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  bio: string;
  deleted: boolean;      // derived from deleted_at; profile fields are blank when true
}

interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  created_at: string;    // UTC "YYYY-MM-DD HH:MM:SS"
}

interface ConversationSummary {
  id: number;
  peer: UserProfile;               // the *other* participant
  last_message: Message | null;    // null only for a just-created empty conversation
}
```

Display rules (client-side, used everywhere a user appears):
- **Name:** `first_name + " " + last_name` if either is set, else `username`;
  `"Deleted User"` when `deleted`.
- **Avatar:** initials of the display name (max 2 chars) on a background color
  picked deterministically by hashing `username` into a fixed palette; gray
  for deleted users. No avatar data is stored.

### Validation (server-enforced; client may pre-check for UX)

| Field | Rule |
|---|---|
| `username` | `/^[a-zA-Z0-9_]{3,20}$/`, unique case-insensitively |
| `password` | ≥ 6 chars |
| `first_name`, `last_name` | trimmed, ≤ 40 chars, may be empty |
| `bio` | trimmed, ≤ 200 chars, may be empty |
| message `content` | non-empty after trim, ≤ 2000 chars |

### REST endpoints

Base URL `http://localhost:4000`, JSON bodies. Errors: proper HTTP status +
`{ "error": string }`. 🔒 = requires `Authorization: Bearer <token>`; the
middleware rejects valid-but-deleted accounts too (a deleted user's JWT is
useless even before it expires).

| Endpoint | Body | Success | Errors |
|---|---|---|---|
| `POST /api/auth/signup` | `{username, password}` | `201 {token, user: UserProfile}` | 400 format, 409 taken |
| `POST /api/auth/login` | `{username, password}` | `200 {token, user: UserProfile}` | 400 missing, 401 bad credentials (never reveals which field) |
| `GET /api/me` 🔒 | — | `200 UserProfile` | |
| `PATCH /api/me` 🔒 | any of `{first_name, last_name, bio}` | `200 UserProfile` | 400 validation |
| `DELETE /api/me` 🔒 | `{password}` | `204` | 401 wrong password |
| `GET /api/users?q=` 🔒 | — | `200 UserProfile[]` — username prefix match, ≤ 10, excludes self + deleted | 400 empty q |
| `POST /api/conversations` 🔒 | `{username}` | `200 ConversationSummary` (existing) or `201` (created) | 404 no such user, 409 user deleted, 400 self |
| `GET /api/conversations` 🔒 | — | `200 ConversationSummary[]`, last activity first | |
| `GET /api/conversations/:id/messages` 🔒 | — | `200 Message[]` — last 50, oldest first | 403 not a participant, 404 |
| `GET /api/health` | — | `200 {ok: true}` | |

### Socket.IO

Connect to `http://localhost:4000` with the JWT in the handshake — there is no
per-event auth:

```ts
io(API_URL, { auth: { token } });
```

Invalid/missing/deleted-account token → connection rejected with
`connect_error` ("Not authenticated"). The client treats that as an expired
session: clear storage, go to `/login`. On connection the server joins the
socket to its personal room `user:<id>`.

**Client → server**

| Event | Payload | Ack |
|---|---|---|
| `message:send` | `{conversation_id, content}` | `{ok: true, message: Message}` or `{ok: false, error: string}` |

Server steps: sender is a participant → content valid → peer not deleted →
INSERT → ack `ok` → emit `message:new` to both `user:` rooms. Any failure acks
`{ok: false, error}` and nothing is stored or emitted.

**Server → client**

| Event | Payload | Sent to | When |
|---|---|---|---|
| `message:new` | `Message` | `user:<sender>` and `user:<peer>` | a message was stored |

**Client obligations**

- Render own messages from the `message:new` broadcast / ack, never
  optimistically — the DB row is the single source of truth.
- On `message:new` for an unknown `conversation_id`, refetch
  `GET /api/conversations` (this is how a brand-new conversation reaches the
  recipient's sidebar).
- On reconnect, refetch the open conversation's history — messages may have
  arrived while disconnected (none are queued server-side).

## Flows

**Auth:** POST credentials → bcrypt check → JWT (7d) + UserProfile → client
stores both in localStorage → REST sends the header; the socket sends the same
token once at handshake.

**Account deletion:** `DELETE /api/me` (password re-check) → one transaction
anonymizes the row → server force-disconnects `user:<id>` sockets → client
clears storage. Old JWTs die because `requireAuth` and the socket handshake
check `deleted_at`. Peers keep the conversation read-only ("Deleted User",
input disabled, sends rejected server-side).

## Decision log

| Decision | Why | Trade-off accepted |
|---|---|---|
| Separate Express server, not Next.js API routes | The client/server split is the lesson; Socket.IO wants a long-lived server | Two processes, CORS |
| SQLite + raw SQL (better-sqlite3) | Zero infra; learn real SQL; sync API keeps handlers simple | Single-writer limits (irrelevant here) |
| JWT in localStorage | Simplest to build and inspect; same token for REST + socket | XSS-readable; httpOnly cookies before any deployment |
| Stateless JWT, no refresh/revocation list | Session management isn't this project's lesson; deleted-account check covers the dangerous case | Logout is client-side only |
| Personal `user:<id>` socket rooms, no join/leave | No room choreography; sidebar updates and multi-tab for free | Client must route messages to the right conversation |
| History over REST, not socket | It's plain request/response; keeps the socket surface to one event each way | — |
| No optimistic UI | One render path; teaches authoritative-server thinking | Round-trip latency (~ms locally) |
| Anonymize on delete, keep messages | Peers keep their history (how real messengers behave); FKs stay valid | "Deleted User" rows live forever |
| Initials avatar, derived client-side | Zero storage/upload complexity | No custom avatars (upload is in "Later") |
