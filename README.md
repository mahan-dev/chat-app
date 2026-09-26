# Practice Chat App

A full-stack real-time chat application built as a learning project.

## Architecture

- **`client/`**: Next.js App Router (TypeScript, Tailwind CSS)
- **`server/`**: Hand-written Express server, TypeScript, Socket.IO, better-sqlite3 (SQLite)

## Getting Started

### Prerequisites

- Node.js 22+
- npm

### Server Setup

1. Navigate to `server/`:
   ```bash
   cd server
   ```
2. Create your `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```
   (Ensure `JWT_SECRET` is set in `server/.env`).

3. Run the server in development mode:
   ```bash
   npm run dev --prefix server
   ```
   The server starts on `http://localhost:4000`.

### Client Setup

1. Navigate to `client/`:
   ```bash
   cd client
   ```
2. Create `.env.local`:
   ```bash
   echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
   ```
3. Run the client in development mode:
   ```bash
   npm run dev --prefix client
   ```
   The client runs on `http://localhost:3000`.
