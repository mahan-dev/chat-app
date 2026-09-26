'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { clearAuth, getToken } from '@/lib/auth';
import { UserProfile, ConversationSummary } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { getDisplayName } from '@/lib/utils';

export default function ChatPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationSummary | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      .catch((err) => {
        setError(err.message || 'Failed to initialize session');
        clearAuth();
        router.replace('/login');
      });
  }, [router]);

  // Handle user search input
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearching(false);
      setSearchError('');
      return;
    }

    setSearching(true);
    setSearchError('');

    searchTimeoutRef.current = setTimeout(() => {
      apiFetch<UserProfile[]>(`/api/users?q=${encodeURIComponent(trimmed)}`)
        .then((users) => {
          setSearchResults(users);
          setSearching(false);
        })
        .catch((err) => {
          setSearchError(err.message || 'Search failed');
          setSearchResults([]);
          setSearching(false);
        });
    }, 200);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleSelectUser = async (user: UserProfile) => {
    try {
      const summary = await apiFetch<ConversationSummary>('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ username: user.username }),
      });

      // Add to conversations list if not already present, or update existing
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === summary.id);
        if (exists) {
          return prev.map((c) => (c.id === summary.id ? summary : c));
        }
        return [summary, ...prev];
      });

      setActiveConversation(summary);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err: any) {
      setSearchError(err.message || 'Failed to open conversation');
    }
  };

  const handleLogout = () => {
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
      {/* Sidebar */}
      <aside className="flex w-80 flex-col border-r border-[#E2DCD2] bg-[#FAF8F5]">
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
            onChange={(e) => setSearchQuery(e.target.value)}
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
                  onClick={() => setActiveConversation(conv)}
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

      {/* Main Chat Pane */}
      <main className="flex flex-1 flex-col bg-[#F4F1EA]">
        {activeConversation ? (
          <>
            {/* Active Conversation Header */}
            <header className="flex items-center justify-between border-b border-[#E2DCD2] bg-[#FAF8F5] px-8 py-4">
              <div className="flex items-center gap-3">
                <Avatar user={activeConversation.peer} size="md" />
                <div>
                  <h2 className="font-semibold text-[#2B2D2F]">{getDisplayName(activeConversation.peer)}</h2>
                  <p className="text-xs text-[#6B6E70]">@{activeConversation.peer.username}</p>
                </div>
              </div>
            </header>

            {/* Message Pane (Empty awaiting F4) */}
            <div className="flex flex-1 items-center justify-center p-6 text-center">
              <div className="max-w-sm rounded-3xl border border-[#E2DCD2] bg-[#FAF8F5] p-8 shadow-xs">
                <h3 className="mb-1 text-lg font-semibold text-[#2B2D2F]">Conversation initialized</h3>
                <p className="text-xs text-[#6B6E70]">
                  Real-time messaging via WebSockets will be wired up in F4.
                </p>
              </div>
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
