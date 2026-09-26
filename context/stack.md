# stack — Technologies and Tooling

Node 22 + npm everywhere. No Docker, no external services, no ORMs.

## Client (`client/`)

| Tech | Role | Why |
|---|---|---|
| Next.js (App Router) | React framework | Industry-standard; file-based routing; the learning target |
| TypeScript (strict) | Language | Types across the whole stack |
| Tailwind CSS | Styling | Utility-first; no separate CSS files to drift |
| socket.io-client | Realtime | Pairs with the server; reconnection built in |

## Server (`server/`)

| Tech | Role | Why |
|---|---|---|
| Express | HTTP framework | Minimal, explicit, the learning target |
| Socket.IO | Websockets | Rooms, acks, auto-reconnect over raw ws |
| better-sqlite3 | Database driver | Embedded SQLite file; synchronous API keeps handlers simple; we write the SQL ourselves |
| jsonwebtoken | Auth tokens | Hand-rolled JWT flow is the lesson |
| bcryptjs | Password hashing | Pure JS (no native build), standard algorithm |
| cors | Middleware | Client and server run on different ports |
| tsx | Dev runner | Runs TypeScript directly with watch mode |

Adding any other dependency requires a row in these tables (same commit).

## Commands

| What | Command |
|---|---|
| Run server (dev) | `npm run dev --prefix server` → http://localhost:4000 |
| Run client (dev) | `npm run dev --prefix client` → http://localhost:3000 |
| Type-check server | `cd server && npx tsc --noEmit` |
| Build client (includes type-check) | `npm run build --prefix client` |
| Reset all data | stop server, delete `server/chat.db*`, restart |

## Environment variables

| File | Variable | Purpose | Dev default |
|---|---|---|---|
| `server/.env` | `PORT` | HTTP + websocket port | `4000` |
| `server/.env` | `JWT_SECRET` | Token signing key | any string; **required**, no fallback in code |
| `server/.env` | `CLIENT_URL` | CORS allowed origin | `http://localhost:3000` |
| `client/.env.local` | `NEXT_PUBLIC_API_URL` | Server base URL | `http://localhost:4000` |

`.env` and `.env.local` are gitignored; `server/.env.example` documents every
variable and must stay current.

The server loads `.env` with Node 22's built-in `--env-file` flag, baked into
its npm scripts (e.g. `tsx watch --env-file=.env src/index.ts`) — **dotenv is
not a dependency**. Next.js loads `.env.local` natively.
