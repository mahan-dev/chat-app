import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { db } from './db.js';
import { Message } from './types.js';

interface JwtPayload {
  userId: number;
}

let ioInstance: Server | null = null;

export function disconnectUserSockets(userId: number): void {
  if (ioInstance) {
    ioInstance.in(`user:${userId}`).disconnectSockets(true);
  }
}

export function setupSockets(io: Server): void {
  ioInstance = io;
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== 'string') {
      return next(new Error('Authentication error: Missing token'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      const user = db.prepare('SELECT id, deleted_at FROM users WHERE id = ?').get(decoded.userId) as any;

      if (!user || user.deleted_at) {
        return next(new Error('Authentication error: User not found or deleted'));
      }

      socket.data.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as number;
    if (!userId) {
      socket.disconnect();
      return;
    }

    // Join personal room
    socket.join(`user:${userId}`);

    socket.on('message:send', (data: { conversation_id?: number; content?: string }, ack?: (response: { message?: Message; error?: string }) => void) => {
      try {
        const { conversation_id, content } = data || {};

        if (!conversation_id || typeof conversation_id !== 'number') {
          if (typeof ack === 'function') ack({ error: 'Conversation ID is required' });
          return;
        }

        if (!content || typeof content !== 'string' || !content.trim()) {
          if (typeof ack === 'function') ack({ error: 'Message content cannot be empty' });
          return;
        }

        const trimmedContent = content.trim();
        if (trimmedContent.length > 2000) {
          if (typeof ack === 'function') ack({ error: 'Message content exceeds 2000 characters' });
          return;
        }

        // Verify conversation exists and user is a participant
        const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversation_id) as any;
        if (!conv) {
          if (typeof ack === 'function') ack({ error: 'Conversation not found' });
          return;
        }

        if (conv.user_a !== userId && conv.user_b !== userId) {
          if (typeof ack === 'function') ack({ error: 'Access denied' });
          return;
        }

        // Verify peer is not deleted
        const peerId = conv.user_a === userId ? conv.user_b : conv.user_a;
        const peer = db.prepare('SELECT deleted_at FROM users WHERE id = ?').get(peerId) as any;
        if (!peer || peer.deleted_at) {
          if (typeof ack === 'function') ack({ error: 'Cannot send message to a deleted user' });
          return;
        }

        // Insert message
        const result = db.prepare(
          'INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)'
        ).run(conversation_id, userId, trimmedContent);

        const messageId = Number(result.lastInsertRowid);
        const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId) as Message;

        // Emit to both participants' personal rooms
        io.to(`user:${conv.user_a}`).to(`user:${conv.user_b}`).emit('message:new', message);

        if (typeof ack === 'function') {
          ack({ message });
        }
      } catch (err: unknown) {
        const errorObj = err as { message?: string };
        if (typeof ack === 'function') {
          ack({ error: errorObj.message || 'Failed to send message' });
        }
      }
    });
  });
}
