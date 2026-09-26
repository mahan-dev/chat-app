'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { clearAuth, getToken } from '@/lib/auth';
import { UserProfile } from '@/lib/types';

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    apiFetch<UserProfile>('/api/me')
      .then((profile) => {
        setUser(profile);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to authenticate');
        clearAuth();
        router.replace('/login');
      });
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.replace('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F1EA] text-[#6B6E70]">
        Loading profile...
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
    <div className="flex min-h-screen flex-col bg-[#F4F1EA] text-[#2B2D2F]">
      <header className="flex items-center justify-between border-b border-[#E2DCD2] bg-[#FAF8F5] px-8 py-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E8DCC7] font-medium text-[#2B2D2F]">
            {user?.username.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="font-semibold text-[#2B2D2F]">{user?.username}</h1>
            <p className="text-xs text-[#6B6E70]">Authenticated session</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-full border border-[#E2DCD2] bg-white px-5 py-2 text-sm font-medium text-[#2B2D2F] transition-colors hover:bg-[#F4F1EA] focus:outline-none"
        >
          Log out
        </button>
      </header>

      <main className="flex flex-1 items-center justify-center p-6 text-center">
        <div className="max-w-md rounded-3xl border border-[#E2DCD2] bg-[#FAF8F5] p-8 shadow-sm">
          <h2 className="mb-2 text-xl font-semibold text-[#2B2D2F]">Chat feature coming soon</h2>
          <p className="text-sm text-[#6B6E70]">
            Authentication is fully set up. Messaging and conversations will be added in upcoming features (F2–F4).
          </p>
        </div>
      </main>
    </div>
  );
}
