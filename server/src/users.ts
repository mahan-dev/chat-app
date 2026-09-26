import { Response } from 'express';
import { db } from './db.js';
import { AuthedRequest, dbUserToProfile } from './auth.js';

export function getUsersHandler(req: AuthedRequest, res: Response): void {
  const q = req.query.q;
  if (!q || typeof q !== 'string' || !q.trim()) {
    res.status(400).json({ error: 'Query parameter q is required' });
    return;
  }

  const queryStr = q.trim();
  const currentUserId = req.userId!;

  const users = db.prepare(
    `SELECT * FROM users 
     WHERE username LIKE ? COLLATE NOCASE 
     AND id != ? 
     AND deleted_at IS NULL 
     LIMIT 10`
  ).all(`${queryStr}%`, currentUserId) as any[];

  res.json(users.map(dbUserToProfile));
}
