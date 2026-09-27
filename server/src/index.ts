import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initDb } from './db.js';
import { signupHandler, loginHandler, getMeHandler, patchMeHandler, deleteMeHandler, requireAuth } from './auth.js';
import { getUsersHandler } from './users.js';
import { createConversationHandler, getConversationsHandler, getMessagesHandler } from './conversations.js';
import { setupSockets } from './sockets.js';

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is missing.');
  process.exit(1);
}

const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

initDb();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

setupSockets(io);

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/signup', signupHandler);
app.post('/api/auth/login', loginHandler);
app.get('/api/me', requireAuth, getMeHandler);
app.patch('/api/me', requireAuth, patchMeHandler);
app.delete('/api/me', requireAuth, deleteMeHandler);

app.get('/api/users', requireAuth, getUsersHandler);
app.get('/api/conversations', requireAuth, getConversationsHandler);
app.post('/api/conversations', requireAuth, createConversationHandler);
app.get('/api/conversations/:id/messages', requireAuth, getMessagesHandler);

httpServer.listen(Number(PORT), () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
