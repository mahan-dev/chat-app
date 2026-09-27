"use client";

import { useEffect, useState, useRef, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { clearAuth, getToken } from "@/lib/auth";
import { UserProfile, ConversationSummary, Message } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { ConfirmModal } from "@/components/ConfirmModal";
import { getDisplayName } from "@/lib/utils";
import { getSocket, disconnectSocket } from "@/lib/socket";

export default function ChatPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<ConversationSummary | null>(null);

  const activeConversationRef = useRef<ConversationSummary | null>(null);
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [peerIsTyping, setPeerIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 60;
    const atBottom = scrollHeight - scrollTop - clientHeight <= threshold;
    setIsAtBottom(atBottom);

    if (scrollTop <= 30 && !loadingMore && hasMoreMessages && messages.length > 0) {
      loadMoreMessages();
    }
  };

  const loadMoreMessages = async () => {
    if (!activeConversation || messages.length === 0 || loadingMore) return;
    const oldestId = messages[0].id;
    setLoadingMore(true);
    const container = messagesContainerRef.current;
    const prevScrollHeight = container ? container.scrollHeight : 0;

    try {
      const older = await apiFetch<Message[]>(
        `/api/conversations/${activeConversation.id}/messages?before_id=${oldestId}`
      );
      if (older.length === 0) {
        setHasMoreMessages(false);
      } else {
        setMessages((prev) => [...older, ...prev]);
        setTimeout(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - prevScrollHeight;
          }
        }, 0);
      }
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom("smooth");
    }
  }, [messages, isAtBottom]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    Promise.all([
      apiFetch<UserProfile>("/api/me"),
      apiFetch<ConversationSummary[]>("/api/conversations"),
    ])
      .then(([profile, convs]) => {
        setCurrentUser(profile);
        setConversations(convs);
        setLoading(false);
      })
      .catch((err: unknown) => {
        const errorObj = err as { message?: string };
        setError(errorObj.message || "Failed to initialize session");
        clearAuth();
        router.replace("/login");
      });

    const socket = getSocket();
    if (socket) {
      setIsConnected(socket.connected);
      const handleConnect = () => setIsConnected(true);
      const handleDisconnect = () => setIsConnected(false);

      socket.on("connect", handleConnect);
      socket.on("disconnect", handleDisconnect);

      const handleNewMessage = (msg: Message) => {
        setConversations((prev) => {
          const index = prev.findIndex((c) => c.id === msg.conversation_id);
          if (index !== -1) {
            const updated = [...prev];
            const conv = { ...updated[index], last_message: msg };
            updated.splice(index, 1);
            updated.unshift(conv);
            return updated;
          } else {
            apiFetch<ConversationSummary[]>("/api/conversations")
              .then((convs) => setConversations(convs))
              .catch(() => {});
            return prev;
          }
        });

        if (activeConversationRef.current?.id === msg.conversation_id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      };

      const handleTyping = (data: {
        conversation_id: number;
        user_id: number;
        is_typing: boolean;
      }) => {
        if (
          activeConversationRef.current?.id === data.conversation_id &&
          activeConversationRef.current.peer.id === data.user_id
        ) {
          setPeerIsTyping(data.is_typing);
        }
      };

      socket.on("message:new", handleNewMessage);
      socket.on("typing", handleTyping);

      return () => {
        socket.off("connect", handleConnect);
        socket.off("disconnect", handleDisconnect);
        socket.off("message:new", handleNewMessage);
        socket.off("typing", handleTyping);
      };
    }
  }, [router]);

  const selectConversation = async (conv: ConversationSummary) => {
    setActiveConversation(conv);
    setMessagesLoading(true);
    setSendError("");
    setHasMoreMessages(true);
    setPeerIsTyping(false);
    try {
      const msgs = await apiFetch<Message[]>(
        `/api/conversations/${conv.id}/messages`
      );
      setMessages(msgs);
      setIsAtBottom(true);
      setTimeout(() => {
        scrollToBottom("auto");
      }, 0);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setSendError(errorObj.message || "Failed to load messages");
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
      setSearchError("");
    } else {
      setSearching(true);
      setSearchError("");
    }
  };

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

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
          if (errorObj.name === "AbortError") return;
          setSearchError(errorObj.message || "Search failed");
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
      const summary = await apiFetch<ConversationSummary>(
        "/api/conversations",
        {
          method: "POST",
          body: JSON.stringify({ username: user.username }),
        },
      );

      setConversations((prev) => {
        const exists = prev.some((c) => c.id === summary.id);
        if (exists) {
          return prev.map((c) => (c.id === summary.id ? summary : c));
        }
        return [summary, ...prev];
      });

      setSearchQuery("");
      setSearchResults([]);
      setSearching(false);
      await selectConversation(summary);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setSearchError(errorObj.message || "Failed to open conversation");
    }
  };

  const handleNewMessageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewMessage(val);

    if (!activeConversation) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit("typing", {
      conversation_id: activeConversation.id,
      is_typing: val.trim().length > 0,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (val.trim().length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing", {
          conversation_id: activeConversation.id,
          is_typing: false,
        });
      }, 2000);
    }
  };

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !newMessage.trim() || sending) return;

    const content = newMessage.trim();
    if (content.length > 2000) {
      setSendError("Message is too long (max 2000 chars)");
      return;
    }

    const socket = getSocket();
    if (!socket || !socket.connected) {
      setSendError("Not connected to chat server. Please check your connection.");
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.emit("typing", {
      conversation_id: activeConversation.id,
      is_typing: false,
    });

    setSending(true);
    setSendError("");

    socket.emit(
      "message:send",
      { conversation_id: activeConversation.id, content },
      (res: { message?: Message; error?: string }) => {
        setSending(false);
        if (res.error) {
          setSendError(res.error);
        } else {
          setNewMessage("");
          setIsAtBottom(true);
        }
      },
    );
  };

  const handleLogout = () => {
    disconnectSocket();
    clearAuth();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F1EA] text-[#6B6E70]">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#C66B3D] border-t-transparent" />
          <span className="text-sm font-medium">Loading workspace...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F1EA] p-4 text-center">
        <div className="rounded-3xl border border-[#E2DCD2] bg-[#FAF8F5] p-8 shadow-sm">
          <p className="text-sm text-[#C66B3D] font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-2xl bg-[#2B2D2F] px-4 py-2 text-xs font-medium text-white hover:bg-[#4A4D4E]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F4F1EA] text-[#2B2D2F]">
      {/* Sidebar */}
      <aside
        className={`flex w-full flex-col border-r border-[#E2DCD2] bg-[#FAF8F5] md:w-80 ${
          activeConversation ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Current user header */}
        <div className="flex items-center justify-between border-b border-[#E2DCD2] p-4">
          <div className="flex items-center gap-3 min-w-0">
            {currentUser && <Avatar user={currentUser} size="sm" />}
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold text-[#2B2D2F]">
                {currentUser ? getDisplayName(currentUser) : ""}
              </h2>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    isConnected ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                  title={isConnected ? "Connected" : "Disconnected"}
                />
                <span className="truncate text-[11px] text-[#6B6E70]">
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href="/profile"
              className="rounded-full border border-[#E2DCD2] bg-white p-2 text-xs font-medium text-[#2B2D2F] hover:bg-[#F4F1EA]"
              title="Profile Settings"
            >
              ⚙
            </Link>
            <button
              onClick={() => setShowLogoutConfirm(true)}
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

          {searchQuery.trim() && (
            <div className="absolute left-4 right-4 top-16 z-10 max-h-60 overflow-y-auto rounded-2xl border border-[#E2DCD2] bg-white shadow-md">
              {searching ? (
                <div className="flex items-center justify-center gap-2 p-4 text-xs text-[#6B6E70]">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#C66B3D] border-t-transparent" />
                  Searching...
                </div>
              ) : searchError ? (
                <div className="p-4 text-center text-xs text-[#C66B3D]">
                  {searchError}
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#6B6E70]">
                  No users found matching &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-[#F4F1EA] border-b border-[#F4F1EA] last:border-b-0"
                  >
                    <Avatar user={user} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-[#2B2D2F]">
                        {getDisplayName(user)}
                      </div>
                      <div className="truncate text-xs text-[#6B6E70]">
                        @{user.username}
                      </div>
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
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <div className="rounded-3xl border border-[#E2DCD2] bg-white p-6 shadow-xs">
                <div className="mb-2 text-lg">💬</div>
                <h3 className="text-sm font-semibold text-[#2B2D2F]">No conversations yet</h3>
                <p className="mt-1 text-xs text-[#6B6E70]">
                  Search for someone above to start chatting.
                </p>
              </div>
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = activeConversation?.id === conv.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors ${
                    isActive
                      ? "bg-[#E8DCC7]/50 font-medium"
                      : "hover:bg-[#FAF8F5]"
                  }`}
                >
                  <Avatar user={conv.peer} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-sm font-semibold text-[#2B2D2F]">
                        {getDisplayName(conv.peer)}
                      </span>
                      {conv.last_message && (
                        <span className="shrink-0 text-[10px] text-[#9A9D9E]">
                          {conv.last_message.created_at.slice(11, 16)}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-[#6B6E70]">
                      {conv.last_message
                        ? conv.last_message.content
                        : "No messages yet"}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Chat Pane */}
      <main
        className={`flex-1 flex-col bg-[#F4F1EA] ${
          activeConversation ? "flex" : "hidden md:flex"
        }`}
      >
        {activeConversation ? (
          <>
            {/* Active Conversation Header */}
            <header className="flex items-center justify-between border-b border-[#E2DCD2] bg-[#FAF8F5] px-4 md:px-8 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setActiveConversation(null)}
                  className="rounded-full border border-[#E2DCD2] bg-white px-3 py-1.5 text-xs font-medium text-[#2B2D2F] hover:bg-[#F4F1EA] md:hidden shrink-0"
                >
                  ← Back
                </button>
                <Avatar user={activeConversation.peer} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-semibold text-[#2B2D2F]">
                      {getDisplayName(activeConversation.peer)}
                    </h2>
                    {peerIsTyping && (
                      <span className="shrink-0 text-xs italic font-medium text-[#C66B3D] animate-pulse">
                        typing...
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-[#6B6E70]">
                    @{activeConversation.peer.username}
                  </p>
                </div>
              </div>
            </header>

            {/* Message History Pane */}
            <div
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
              className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4"
            >
              {loadingMore && (
                <div className="flex justify-center py-2">
                  <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-[#6B6E70] shadow-xs border border-[#E2DCD2]">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#C66B3D] border-t-transparent" />
                    Loading older messages...
                  </div>
                </div>
              )}

              {messagesLoading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="flex items-center gap-3 text-xs text-[#6B6E70]">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#C66B3D] border-t-transparent" />
                    Loading messages...
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center p-4">
                  <div className="max-w-xs rounded-3xl border border-[#E2DCD2] bg-[#FAF8F5] p-6 text-xs text-[#6B6E70] shadow-xs">
                    <div className="mb-2 text-base">👋</div>
                    <div className="font-semibold text-[#2B2D2F]">Start the conversation</div>
                    <div className="mt-1">Send a message below to begin chatting with {getDisplayName(activeConversation.peer)}.</div>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === currentUser?.id;
                  const senderUser = isMe
                    ? currentUser
                    : activeConversation.peer;
                  const timeString = new Date(
                    msg.created_at.replace(" ", "T") + "Z",
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <Avatar user={senderUser} size="sm" />
                      <div
                        className={`max-w-[75%] md:max-w-md rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
                          isMe
                            ? "bg-[#2B2D2F] text-white rounded-br-xs"
                            : "bg-white text-[#2B2D2F] border border-[#E2DCD2] rounded-bl-xs"
                        }`}
                      >
                        <div className="break-words">{msg.content}</div>
                        <div
                          className={`mt-1 text-[10px] text-right ${
                            isMe ? "text-[#C5C7C8]" : "text-[#9A9D9E]"
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
                <div className="mb-2 rounded-2xl bg-[#FDF2F0] px-4 py-3 text-xs text-[#C66B3D] flex items-center justify-between">
                  <span>{sendError}</span>
                  <button
                    onClick={() => setSendError("")}
                    className="font-bold hover:underline ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}
              {activeConversation.peer.deleted ? (
                <div className="text-center text-xs text-[#6B6E70] py-2 rounded-2xl bg-[#F4F1EA]">
                  This user has deleted their account. This conversation is read-only.
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleNewMessageChange}
                    placeholder="Type a message..."
                    maxLength={2000}
                    className="flex-1 rounded-2xl border border-[#E2DCD2] bg-white px-4 py-3 text-sm text-[#2B2D2F] placeholder-[#9A9D9E] focus:border-[#C66B3D] focus:outline-none focus:ring-1 focus:ring-[#C66B3D]"
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="rounded-2xl bg-[#2B2D2F] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#4A4D4E] focus:outline-none focus:ring-2 focus:ring-[#2B2D2F] focus:ring-offset-2 disabled:opacity-50 shrink-0"
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </form>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <div className="max-w-md rounded-3xl border border-[#E2DCD2] bg-[#FAF8F5] p-8 shadow-sm">
              <div className="mb-3 text-3xl">💬</div>
              <h3 className="mb-2 text-xl font-semibold text-[#2B2D2F]">
                No conversation selected
              </h3>
              <p className="text-sm text-[#6B6E70]">
                Search for a user in the sidebar or select an existing conversation to view chat details.
              </p>
            </div>
          </div>
        )}
      </main>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Log out"
        description="Are you sure you want to log out of your account?"
        confirmText="Log out"
        onConfirm={handleLogout}
        onClose={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}
