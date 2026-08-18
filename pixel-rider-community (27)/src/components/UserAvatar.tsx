import React, { useState } from 'react';
import { User } from '../types';
import { User as UserIcon } from 'lucide-react';

interface UserAvatarProps {
  username?: string;
  avatarUrl?: string;
  allUsers?: User[];
  currentUser?: User | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  bordered?: boolean;
  borderColor?: string;
  alt?: string;
  onClick?: () => void;
}

const sizeClasses = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-24 h-24 text-3xl',
};

const iconSizes = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
  '2xl': 'w-12 h-12',
};

// Deterministic pleasing gradient background based on username
function getAvatarGradient(name: string): string {
  if (!name) return 'from-slate-800 to-slate-900 text-slate-300';
  const clean = name.trim().toLowerCase();
  if (clean === 'nican') return 'from-red-600 to-amber-600 text-white';
  
  const gradients = [
    'from-purple-600 to-indigo-700 text-white',
    'from-amber-500 to-orange-600 text-black',
    'from-cyan-500 to-blue-600 text-white',
    'from-emerald-500 to-teal-700 text-white',
    'from-fuchsia-600 to-pink-600 text-white',
    'from-rose-600 to-red-700 text-white',
    'from-violet-600 to-purple-800 text-white',
  ];
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  username = '',
  avatarUrl,
  allUsers,
  currentUser,
  size = 'md',
  className = '',
  bordered = false,
  borderColor = 'border-amber-500/50',
  alt,
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);

  // Resolve effective avatar URL
  let resolvedUrl = avatarUrl;

  if (!resolvedUrl && username) {
    const clean = username.trim().toLowerCase();
    if (currentUser && currentUser.username && currentUser.username.trim().toLowerCase() === clean && currentUser.avatar_url) {
      resolvedUrl = currentUser.avatar_url;
    } else if (allUsers && allUsers.length > 0) {
      const match = allUsers.find((u) => u.username && u.username.trim().toLowerCase() === clean);
      if (match && match.avatar_url) {
        resolvedUrl = match.avatar_url;
      }
    }
  }

  const sizeCls = sizeClasses[size] || sizeClasses.md;
  const iconCls = iconSizes[size] || iconSizes.md;
  const borderCls = bordered ? `border-2 ${borderColor}` : '';
  const initials = username ? username.trim().slice(0, 2).toUpperCase() : '?';

  if (resolvedUrl && !imageError) {
    return (
      <div
        onClick={onClick}
        className={`relative inline-flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 select-none ${sizeCls} ${borderCls} ${
          onClick ? 'cursor-pointer hover:opacity-90' : ''
        } ${className}`}
        title={username ? `@${username}` : undefined}
      >
        <img
          src={resolvedUrl}
          alt={alt || username || 'Avatar'}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Fallback with initials and styled gradient
  const gradientCls = getAvatarGradient(username);

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 font-extrabold select-none bg-gradient-to-br ${gradientCls} ${sizeCls} ${borderCls} ${
        onClick ? 'cursor-pointer hover:opacity-90' : ''
      } ${className}`}
      title={username ? `@${username}` : undefined}
    >
      {username ? (
        <span>{initials}</span>
      ) : (
        <UserIcon className={iconCls} />
      )}
    </div>
  );
};
