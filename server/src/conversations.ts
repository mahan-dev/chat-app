import { Response } from 'express';
import { db } from './db.js';
import { AuthedRequest, dbUserToProfile } from './auth.js';
import { ConversationSummary, Message, UserProfile } from './types.js';

export function createConversationHandler(req: AuthedRequest, res: Response): void {
  const currentUserId = req.userId!;
  const { username } = req.body;

  if (!username || typeof username !== 'string') {
    res.status(400).json({ error: 'Username is required' });
    return;
  }

  const targetUser = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username.trim()) as any;
  if (!targetUser) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (targetUser.id === currentUserId) {
    res.status(400).json({ error: 'Cannot create conversation with yourself' });
    return;
  }

  if (targetUser.deleted_at) {
    res.status(409).json({ error: 'User is deleted' });
    return;
  }

  const user_a = Math.min(currentUserId, targetUser.id);
  const user_b = Math.max(currentUserId, targetUser.id);

  let conversation = db.prepare(
    'SELECT * FROM conversations WHERE user_a = ? AND user_b = ?'
  ).get(user_a, user_b) as any;

  let statusCode = 200;
  if (!conversation) {
    try {
      const result = db.prepare(
        'INSERT INTO conversations (user_a, user_b) VALUES (?, ?)'
      ).run(user_a, user_b);
      const convId = Number(result.lastInsertRowid);
      conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(convId);
      statusCode = 201;
    } catch (err) {
      conversation = db.prepare(
        'SELECT * FROM conversations WHERE user_a = ? AND user_b = ?'
      ).get(user_a, user_b);
    }
  }

  const peer = dbUserToProfile(targetUser);
  const summary: ConversationSummary = {
    id: conversation.id,
    peer,
    last_message: null,
  };

  res.status(statusCode).json(summary);
}

export function getConversationsHandler(req: AuthedRequest, res: Response): void {
  const currentUserId = req.userId!;

  const rows = db.prepare(
    `SELECT c.id as conversation_id, c.created_at as conversation_created_at,
            u.id as peer_id, u.username as peer_username, u.first_name as peer_first_name, u.last_name as peer_last_name, u.bio as peer_bio, u.deleted_at as peer_deleted_at, u.created_at as peer_created_at
     FROM conversations c
     JOIN users u ON (u.id = CASE WHEN c.user_a = ? THEN c.user_b ELSE c.user_a END)
     WHERE c.user_a = ? OR c.user_b = ?`
  ).all(currentUserId, currentUserId, currentUserId) as any[];

  const summaries: ConversationSummary[] = [];

  for (const row of rows) {
    const peer: UserProfile = {
      id: row.peer_id,
      username: row.peer_username,
      first_name: row.peer_deleted_at ? '' : (row.peer_first_name || ''),
      last_name: row.peer_deleted_at ? '' : (row.peer_last_name || ''),
      bio: row.peer_deleted_at ? '' : (row.peer_bio || ''),
      deleted: Boolean(row.peer_deleted_at),
    };

    const lastMsgRow = db.prepare(
      `SELECT * FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 1`
    ).get(row.conversation_id) as any;

    let last_message: Message | null = null;
    if (lastMsgRow) {
      last_message = {
        id: lastMsgRow.id,
        conversation_id: lastMsgRow.conversation_id,
        sender_id: lastMsgRow.sender_id,
        content: lastMsgRow.content,
        created_at: lastMsgRow.created_at,
      };
    }

    summaries.push({
      id: row.conversation_id,
      peer,
      last_message,
    });
  }

  summaries.sort((a, b) => {
    const timeA = a.last_message?.created_at || '';
    const timeB = b.last_message?.created_at || '';
    if (timeA !== timeB) {
      return timeB.localeCompare(timeA);
    }
    return b.id - a.id;
  });

  res.json(summaries);
}

export function getMessagesHandler(req: AuthedRequest, res: Response): void {
  const currentUserId = req.userId!;
  const conversationId = Number(req.params.id);
  const beforeId = req.query.before_id ? Number(req.query.before_id) : null;

  if (isNaN(conversationId)) {
    res.status(400).json({ error: 'Invalid conversation ID' });
    return;
  }

  const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId) as any;
  if (!conv) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  if (conv.user_a !== currentUserId && conv.user_b !== currentUserId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  let messages: Message[];
  if (beforeId && !isNaN(beforeId)) {
    messages = db.prepare(
      `SELECT * FROM (
         SELECT * FROM messages WHERE conversation_id = ? AND id < ? ORDER BY id DESC LIMIT 50
       ) ORDER BY id ASC`
    ).all(conversationId, beforeId) as Message[];
  } else {
    messages = db.prepare(
      `SELECT * FROM (
         SELECT * FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 50
       ) ORDER BY id ASC`
    ).all(conversationId) as Message[];
  }

  res.json(messages);
}
