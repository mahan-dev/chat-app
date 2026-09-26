import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db.js';
import { UserProfile } from './types.js';

export interface AuthedRequest extends Request {
  user?: UserProfile;
  userId?: number;
}

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export function dbUserToProfile(user: any): UserProfile {
  const isDeleted = Boolean(user.deleted_at);
  return {
    id: user.id,
    username: user.username,
    first_name: isDeleted ? '' : (user.first_name || ''),
    last_name: isDeleted ? '' : (user.last_name || ''),
    bio: isDeleted ? '' : (user.bio || ''),
    deleted: isDeleted,
  };
}

export function signupHandler(req: Request, res: Response): void {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  if (!USERNAME_REGEX.test(username)) {
    res.status(400).json({ error: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores' });
    return;
  }

  if (typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(username);
  if (existing) {
    res.status(409).json({ error: 'Username already taken' });
    return;
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);
  const userId = Number(result.lastInsertRowid);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '7d' });

  res.status(201).json({
    token,
    user: dbUserToProfile(user),
  });
}

export function loginHandler(req: Request, res: Response): void {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username) as any;

  if (!user || user.deleted_at || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });

  res.json({
    token,
    user: dbUserToProfile(user),
  });
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId) as any;

    if (!user || user.deleted_at) {
      res.status(401).json({ error: 'Not authenticated or account deleted' });
      return;
    }

    req.user = dbUserToProfile(user);
    req.userId = user.id;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function getMeHandler(req: AuthedRequest, res: Response): void {
  res.json(req.user);
}

export function patchMeHandler(req: AuthedRequest, res: Response): void {
  const userId = req.userId!;
  const { first_name, last_name, bio } = req.body;

  const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!currentUser || currentUser.deleted_at) {
    res.status(401).json({ error: 'Not authenticated or account deleted' });
    return;
  }

  let newFirstName = currentUser.first_name;
  let newLastName = currentUser.last_name;
  let newBio = currentUser.bio;

  if (first_name !== undefined) {
    if (typeof first_name !== 'string') {
      res.status(400).json({ error: 'Invalid first_name' });
      return;
    }
    const trimmed = first_name.trim();
    if (trimmed.length > 40) {
      res.status(400).json({ error: 'First name must be 40 characters or less' });
      return;
    }
    newFirstName = trimmed;
  }

  if (last_name !== undefined) {
    if (typeof last_name !== 'string') {
      res.status(400).json({ error: 'Invalid last_name' });
      return;
    }
    const trimmed = last_name.trim();
    if (trimmed.length > 40) {
      res.status(400).json({ error: 'Last name must be 40 characters or less' });
      return;
    }
    newLastName = trimmed;
  }

  if (bio !== undefined) {
    if (typeof bio !== 'string') {
      res.status(400).json({ error: 'Invalid bio' });
      return;
    }
    const trimmed = bio.trim();
    if (trimmed.length > 200) {
      res.status(400).json({ error: 'Bio must be 200 characters or less' });
      return;
    }
    newBio = trimmed;
  }

  db.prepare(
    'UPDATE users SET first_name = ?, last_name = ?, bio = ? WHERE id = ?'
  ).run(newFirstName, newLastName, newBio, userId);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  res.json(dbUserToProfile(updated));
}
