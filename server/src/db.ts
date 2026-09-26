import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'chat.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT    NOT NULL,
      first_name    TEXT    NOT NULL DEFAULT '',
      last_name     TEXT    NOT NULL DEFAULT '',
      bio           TEXT    NOT NULL DEFAULT '',
      deleted_at    TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_a     INTEGER NOT NULL REFERENCES users(id),
      user_b     INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_a, user_b),
      CHECK (user_a < user_b)
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
  `);
}
