'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { getToken, setAuth, clearAuth } from '@/lib/auth';
import { UserProfile } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { getDisplayName } from '@/lib/utils';
import { disconnectSocket } from '@/lib/socket';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    apiFetch<UserProfile>('/api/me')
      .then((profile) => {
        setUser(profile);
        setFirstName(profile.first_name || '');
        setLastName(profile.last_name || '');
        setBio(profile.bio || '');
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load profile');
        clearAuth();
        router.replace('/login');
      });
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const updated = await apiFetch<UserProfile>('/api/me', {
        method: 'PATCH',
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          bio,
        }),
      });

      setUser(updated);
      const token = getToken();
      if (token) {
        setAuth(token, updated);
      }
      setSuccess('Profile updated successfully.');
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (e: FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    setDeleting(true);

    try {
      await apiFetch('/api/me', {
        method: 'DELETE',
        body: JSON.stringify({ password: deletePassword }),
      });

      disconnectSocket();
      clearAuth();
      router.replace('/login');
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setDeleteError(errorObj.message || 'Failed to delete account');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F1EA] text-[#6B6E70]">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F1EA] text-[#2B2D2F]">
      <header className="flex items-center justify-between border-b border-[#E2DCD2] bg-[#FAF8F5] px-8 py-4 shadow-xs">
        <div className="flex items-center gap-3">
          {user && <Avatar user={user} size="sm" />}
          <h1 className="font-semibold text-[#2B2D2F]">Profile Settings</h1>
        </div>
        <Link
          href="/chat"
          className="rounded-full border border-[#E2DCD2] bg-white px-5 py-2 text-sm font-medium text-[#2B2D2F] transition-colors hover:bg-[#F4F1EA]"
        >
          ← Back to chat
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-3xl border border-[#E2DCD2] bg-[#FAF8F5] p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-4">
            {user && <Avatar user={user} size="lg" />}
            <div>
              <h2 className="text-xl font-semibold text-[#2B2D2F]">{user ? getDisplayName(user) : ''}</h2>
              <p className="text-sm text-[#6B6E70]">@{user?.username}</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl bg-[#FDF2F0] p-4 text-sm text-[#C66B3D]">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-2xl bg-[#F0F5F1] p-4 text-sm text-[#5A7353]">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[#4A4D4E]">First name</label>
                <input
                  type="text"
                  maxLength={40}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="mt-1.5 block w-full rounded-2xl border border-[#E2DCD2] bg-white px-4 py-3 text-sm text-[#2B2D2F] placeholder-[#9A9D9E] focus:border-[#C66B3D] focus:outline-none focus:ring-1 focus:ring-[#C66B3D]"
                />
                <span className="mt-1 block text-xs text-[#9A9D9E]">{firstName.length}/40</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4A4D4E]">Last name</label>
                <input
                  type="text"
                  maxLength={40}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="mt-1.5 block w-full rounded-2xl border border-[#E2DCD2] bg-white px-4 py-3 text-sm text-[#2B2D2F] placeholder-[#9A9D9E] focus:border-[#C66B3D] focus:outline-none focus:ring-1 focus:ring-[#C66B3D]"
                />
                <span className="mt-1 block text-xs text-[#9A9D9E]">{lastName.length}/40</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#4A4D4E]">Bio</label>
              <textarea
                rows={3}
                maxLength={200}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell something about yourself..."
                className="mt-1.5 block w-full rounded-2xl border border-[#E2DCD2] bg-white px-4 py-3 text-sm text-[#2B2D2F] placeholder-[#9A9D9E] focus:border-[#C66B3D] focus:outline-none focus:ring-1 focus:ring-[#C66B3D]"
              />
              <span className="mt-1 block text-xs text-[#9A9D9E]">{bio.length}/200</span>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-[#2B2D2F] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#4A4D4E] focus:outline-none focus:ring-2 focus:ring-[#2B2D2F] focus:ring-offset-2 disabled:opacity-50"
            >
              {saving ? 'Saving changes...' : 'Save changes'}
            </button>
          </form>

          {/* Danger Zone */}
          <div className="mt-8 border-t border-[#E2DCD2] pt-6">
            <h3 className="mb-2 text-base font-semibold text-[#C66B3D]">Danger Zone</h3>
            <p className="mb-4 text-sm text-[#6B6E70]">
              Permanently delete your account and anonymize your profile. This action cannot be undone.
            </p>

            {deleteError && (
              <div className="mb-4 rounded-2xl bg-[#FDF2F0] p-4 text-sm text-[#C66B3D]">
                {deleteError}
              </div>
            )}

            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-2xl border border-[#C66B3D] bg-white px-4 py-2.5 text-sm font-medium text-[#C66B3D] transition-colors hover:bg-[#FDF2F0]"
              >
                Delete account...
              </button>
            ) : (
              <form onSubmit={handleDeleteAccount} className="space-y-4 rounded-2xl border border-[#C66B3D]/30 bg-[#FDF2F0]/30 p-4">
                <div>
                  <label className="block text-sm font-medium text-[#2B2D2F]">
                    Enter your password to confirm account deletion
                  </label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Your current password"
                    required
                    className="mt-1.5 block w-full rounded-2xl border border-[#E2DCD2] bg-white px-4 py-3 text-sm text-[#2B2D2F] placeholder-[#9A9D9E] focus:border-[#C66B3D] focus:outline-none focus:ring-1 focus:ring-[#C66B3D]"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={deleting || !deletePassword}
                    className="rounded-2xl bg-[#C66B3D] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#b05930] focus:outline-none focus:ring-2 focus:ring-[#C66B3D] focus:ring-offset-2 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting account...' : 'Yes, delete my account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeletePassword('');
                      setDeleteError('');
                    }}
                    disabled={deleting}
                    className="rounded-2xl border border-[#E2DCD2] bg-white px-4 py-2.5 text-sm font-medium text-[#2B2D2F] transition-colors hover:bg-[#F4F1EA]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
