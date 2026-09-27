'use client';

import { useEffect, useState, useRef, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { clearAuth, getToken } from '@/lib/auth';
import { UserProfile, ConversationSummary, Message } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { getDisplayName } from '@/lib/utils';
import { getSocket, disconnectSocket } from '@/lib/socket';

export default function ChatPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationSummary | null>(null);
  
  const activeConversationRef = useRef<ConversationSummary | null>(null);
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    console.log("hi")
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    Promise.all([
      apiFetch<UserProfile>('/api/me'),
      apiFetch<ConversationSummary[]>('/api/conversations'),
    ])
      .then(([profile, convs]) => {
        setCurrentUser(profile);
        setConversations(convs);
        setLoading(false);
      })
      .catch((err: unknown) => {
        const errorObj = err as { message?: string };
        setError(errorObj.message || 'Failed to initialize session');
        clearAuth();
        router.replace('/login');
      });

    const socket = getSocket();
    if (socket) {
      const handleNewMessage = (msg: Message) => {
        // Update sidebar conversations
        setConversations((prev) => {
          const index = prev.findIndex((c) => c.id === msg.conversation_id);
          if (index !== -1) {
            const updated = [...prev];
            const conv = { ...updated[index], last_message: msg };
            updated.splice(index, 1);
            updated.unshift(conv);
            return updated;
          } else {
            // New conversation we didn't have in state yet, fetch conversations list
            apiFetch<ConversationSummary[]>('/api/conversations')
              .then((convs) => setConversations(convs))
              .catch(() => {});
            return prev;
          }
        });

        // Append to active conversation messages if currently viewing it
        if (activeConversationRef.current?.id === msg.conversation_id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      };

      socket.on('message:new', handleNewMessage);

      return () => {
        socket.off('message:new', handleNewMessage);
      };
    }
  }, [router]);

  const selectConversation = async (conv: ConversationSummary) => {
    setActiveConversation(conv);
    setMessagesLoading(true);
    setSendError('');
    try {
      const msgs = await apiFetch<Message[]>(`/api/conversations/${conv.id}/messages`);
      setMessages(msgs);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setSendError(errorObj.message || 'Failed to load messages');
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      setSearching(false);
      setSearchError('');
    } else {
      setSearching(true);
      setSearchError('');
    }
  };

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(() => {
      apiFetch<UserProfile[]>(`/api/users?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then((users) => {
          setSearchResults(users);
          setSearching(false);
        })
        .catch((err: unknown) => {
          const errorObj = err as { name?: string; message?: string };
          if (errorObj.name === 'AbortError') return;
          setSearchError(errorObj.message || 'Search failed');
          setSearchResults([]);
          setSearching(false);
        });
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const handleSelectUser = async (user: UserProfile) => {
    try {
      const summary = await apiFetch<ConversationSummary>('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ username: user.username }),
      });

      setConversations((prev) => {
        const exists = prev.some((c) => c.id === summary.id);
        if (exists) {
          return prev.map((c) => (c.id === summary.id ? summary : c));
        }
        return [summary, ...prev];
      });

      setSearchQuery('');
      setSearchResults([]);
      setSearching(false);
      await selectConversation(summary);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setSearchError(errorObj.message || 'Failed to open conversation');
    }
  };

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !newMessage.trim() || sending) return;

    const content = newMessage.trim();
    if (content.length > 2000) {
      setSendError('Message is too long (max 2000 chars)');
      return;
    }

    const socket = getSocket();
    if (!socket) {
      setSendError('Not connected to chat server');
      return;
    }

    setSending(true);
    setSendError('');

    socket.emit('message:send', { conversation_id: activeConversation.id, content }, (res: { message?: Message; error?: string }) => {
      setSending(false);
      if (res.error) {
        setSendError(res.error);
      } else {
        setNewMessage('');
      }
    });
  };

  const handleLogout = () => {
    disconnectSocket();
    clearAuth();
    router.replace('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F1EA] text-[#6B6E70]">
        Loading workspace...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F1EA] text-[#C66B3D]">
        {error}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F4F1EA] text-[#2B2D2F]">
      {/* Sidebar: hidden on mobile when active conversation is selected */}
      <aside
        className={`flex w-full flex-col border-r border-[#E2DCD2] bg-[#FAF8F5] md:w-80 ${
          activeConversation ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Current user header */}
        <div className="flex items-center justify-between border-b border-[#E2DCD2] p-4">
          <div className="flex items-center gap-3 overflow-hidden">
            {currentUser && <Avatar user={currentUser} size="sm" />}
            <div className="truncate">
              <h2 className="truncate text-sm font-semibold text-[#2B2D2F]">{currentUser ? getDisplayName(currentUser) : ''}</h2>
              <p className="truncate text-xs text-[#6B6E70]">@{currentUser?.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="rounded-full border border-[#E2DCD2] bg-white p-2 text-xs font-medium text-[#2B2D2F] hover:bg-[#F4F1EA]"
              title="Profile Settings"
            >
              ⚙
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-full border border-[#E2DCD2] bg-white p-2 text-xs font-medium text-[#2B2D2F] hover:bg-[#F4F1EA]"
              title="Log out"
            >
              🚪
            </button>
          </div>
        </div>

        {/* Search Box */}
        <div className="relative p-4 border-b border-[#E2DCD2]">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search people to message..."
            className="w-full rounded-2xl border border-[#E2DCD2] bg-white px-4 py-2.5 text-sm text-[#2B2D2F] placeholder-[#9A9D9E] focus:border-[#C66B3D] focus:outline-none focus:ring-1 focus:ring-[#C66B3D]"
          />

          {/* Search Results Dropdown */}
          {searchQuery.trim() && (
            <div className="absolute left-4 right-4 top-16 z-10 max-h-60 overflow-y-auto rounded-2xl border border-[#E2DCD2] bg-white shadow-md">
              {searching ? (
                <div className="p-3 text-center text-xs text-[#6B6E70]">Searching...</div>
              ) : searchError ? (
                <div className="p-3 text-center text-xs text-[#C66B3D]">{searchError}</div>
              ) : searchResults.length === 0 ? (
                <div className="p-3 text-center text-xs text-[#6B6E70]">No users found</div>
              ) : (
                searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-[#F4F1EA] border-b border-[#F4F1EA] last:border-b-0"
                  >
                    <Avatar user={user} size="sm" />
                    <div className="truncate">
                      <div className="text-sm font-medium text-[#2B2D2F]">{getDisplayName(user)}</div>
                      <div className="text-xs text-[#6B6E70]">@{user.username}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#6B6E70]">
              No conversations yet. Search for someone above to start chatting.
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = activeConversation?.id === conv.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors ${
                    isActive ? 'bg-[#E8DCC7]/50 font-medium' : 'hover:bg-[#FAF8F5]'
                  }`}
                >
                  <Avatar user={conv.peer} size="md" />
                  <div className="flex-1 truncate">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#2B2D2F]">{getDisplayName(conv.peer)}</span>
                      {conv.last_message && (
                        <span className="text-[10px] text-[#9A9D9E]">
                          {conv.last_message.created_at.slice(11, 16)}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-[#6B6E70]">
                      {conv.last_message ? conv.last_message.content : 'No messages yet'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Chat Pane: hidden on mobile when no active conversation */}
      <main
        className={`flex-1 flex-col bg-[#F4F1EA] ${
          activeConversation ? 'flex' : 'hidden md:flex'
        }`}
      >
        {activeConversation ? (
          <>
            {/* Active Conversation Header */}
            <header className="flex items-center justify-between border-b border-[#E2DCD2] bg-[#FAF8F5] px-4 md:px-8 py-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveConversation(null)}
                  className="rounded-full border border-[#E2DCD2] bg-white px-3 py-1.5 text-xs font-medium text-[#2B2D2F] hover:bg-[#F4F1EA] md:hidden"
                >
                  ← Back
                </button>
                <Avatar user={activeConversation.peer} size="md" />
                <div>
                  <h2 className="font-semibold text-[#2B2D2F]">{getDisplayName(activeConversation.peer)}</h2>
                  <p className="text-xs text-[#6B6E70]">@{activeConversation.peer.username}</p>
                </div>
              </div>
            </header>

            {/* Message History Pane */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {messagesLoading ? (
                <div className="flex h-full items-center justify-center text-xs text-[#6B6E70]">
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center">
                  <div className="max-w-xs rounded-3xl border border-[#E2DCD2] bg-[#FAF8F5] p-6 text-xs text-[#6B6E70]">
                    No messages yet. Send a message below to start the conversation!
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === currentUser?.id;
                  const senderUser = isMe ? currentUser : activeConversation.peer;
                  const timeString = new Date(msg.created_at.replace(' ', 'T') + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <Avatar user={senderUser} size="sm" />
                      <div
                        className={`max-w-md rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
                          isMe
                            ? 'bg-[#2B2D2F] text-white rounded-br-xs'
                            : 'bg-white text-[#2B2D2F] border border-[#E2DCD2] rounded-bl-xs'
                        }`}
                      >
                        <div className="break-words">{msg.content}</div>
                        <div
                          className={`mt-1 text-[10px] text-right ${
                            isMe ? 'text-[#C5C7C8]' : 'text-[#9A9D9E]'
                          }`}
                        >
                          {timeString}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Send Message Form */}
            <div className="border-t border-[#E2DCD2] bg-[#FAF8F5] p-4">
              {sendError && (
                <div className="mb-2 rounded-xl bg-[#FDF2F0] px-3 py-2 text-xs text-[#C66B3D]">
                  {sendError}
                </div>
              )}
              {activeConversation.peer.deleted ? (
                <div className="text-center text-xs text-[#6B6E70] py-2">
                  This user has deleted their account. This conversation is read-only.
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    maxLength={2000}
                    className="flex-1 rounded-2xl border border-[#E2DCD2] bg-white px-4 py-3 text-sm text-[#2B2D2F] placeholder-[#9A9D9E] focus:border-[#C66B3D] focus:outline-none focus:ring-1 focus:ring-[#C66B3D]"
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="rounded-2xl bg-[#2B2D2F] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#4A4D4E] focus:outline-none focus:ring-2 focus:ring-[#2B2D2F] focus:ring-offset-2 disabled:opacity-50"
                  >
                    Send
                  </button>
                </form>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <div className="max-w-md rounded-3xl border border-[#E2DCD2] bg-[#FAF8F5] p-8 shadow-sm">
              <h3 className="mb-2 text-xl font-semibold text-[#2B2D2F]">No conversation selected</h3>
              <p className="text-sm text-[#6B6E70]">
                Search for a user in the sidebar or select an existing conversation to view chat details.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
