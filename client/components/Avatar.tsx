import { getDisplayName, getAvatarColor } from '@/lib/utils';

interface AvatarProps {
  user: { username: string; first_name?: string; last_name?: string; deleted?: boolean };
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({ user, size = 'md' }: AvatarProps) {
  const name = getDisplayName(user);
  const initials = user.deleted
    ? 'DU'
    : name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || user.username.slice(0, 2).toUpperCase();

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-11 w-11 text-sm',
    lg: 'h-16 w-16 text-lg',
  }[size];

  const colorClass = user.deleted ? 'bg-[#E2DCD2] text-[#6B6E70]' : getAvatarColor(user.username);

  return (
    <div className={`flex items-center justify-center rounded-full font-medium ${sizeClasses} ${colorClass}`}>
      {initials}
    </div>
  );
}
