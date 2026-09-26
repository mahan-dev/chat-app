'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { setAuth } from '@/lib/auth';
import { UserProfile } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await apiFetch<{ token: string; user: UserProfile }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      setAuth(res.token, res.user);
      router.push('/chat');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F1EA] p-4 text-[#2B2D2F]">
      <div className="w-full max-w-md rounded-3xl border border-[#E2DCD2] bg-[#FAF8F5] p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#2B2D2F]">Welcome back</h1>
          <p className="mt-1 text-sm text-[#6B6E70]">Please enter your credentials to log in.</p>
        </div>
        
        {error && (
          <div className="mb-4 rounded-2xl bg-[#FDF2F0] p-4 text-sm text-[#C66B3D]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#4A4D4E]">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              className="mt-1.5 block w-full rounded-2xl border border-[#E2DCD2] bg-white px-4 py-3 text-sm text-[#2B2D2F] placeholder-[#9A9D9E] focus:border-[#C66B3D] focus:outline-none focus:ring-1 focus:ring-[#C66B3D]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#4A4D4E]">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 block w-full rounded-2xl border border-[#E2DCD2] bg-white px-4 py-3 text-sm text-[#2B2D2F] placeholder-[#9A9D9E] focus:border-[#C66B3D] focus:outline-none focus:ring-1 focus:ring-[#C66B3D]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[#2B2D2F] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#4A4D4E] focus:outline-none focus:ring-2 focus:ring-[#2B2D2F] focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#6B6E70]">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-[#C66B3D] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
