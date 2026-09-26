import { UserProfile } from './types';

export function getDisplayName(user: { first_name?: string; last_name?: string; username: string; deleted?: boolean }): string {
  if (user.deleted) return 'Deleted User';
  const fn = (user.first_name || '').trim();
  const ln = (user.last_name || '').trim();
  if (fn || ln) {
    return `${fn} ${ln}`.trim();
  }
  return user.username;
}

const PALETTE = [
  'bg-[#E8DCC7] text-[#2B2D2F]',
  'bg-[#D4C5B9] text-[#2B2D2F]',
  'bg-[#C6B39E] text-[#2B2D2F]',
  'bg-[#B5C2B7] text-[#2B2D2F]',
  'bg-[#A3B19B] text-[#2B2D2F]',
  'bg-[#D8C2A8] text-[#2B2D2F]',
  'bg-[#C2B295] text-[#2B2D2F]',
];

export function getAvatarColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}
