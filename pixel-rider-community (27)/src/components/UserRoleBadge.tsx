import React from 'react';
import { User, UserRole } from '../types';
import { Sparkles, Shield, Crown } from 'lucide-react';

export function normalizeRole(role?: string): string {
  if (!role) return 'member';
  const r = role.trim().toLowerCase();
  if (r === 'ehren pixel' || r === 'ehrenpixel' || r === 'ehren_pixel' || r === 'ehren-pixel') {
    return 'ehren pixel';
  }
  if (r === 'admin' || r === 'founder' || r === 'founder & admin') {
    return 'admin';
  }
  if (r === 'moderator' || r === 'mod' || r === 'moderator & tourguide') {
    return 'moderator';
  }
  return 'member';
}

export function getUserRole(
  username?: string,
  allUsers?: User[],
  currentUser?: User | null
): string {
  if (!username) return 'member';
  const uClean = username.trim().toLowerCase();
  
  if (uClean === 'nican') return 'admin';

  if (currentUser && currentUser.username.trim().toLowerCase() === uClean) {
    if (currentUser.isAdmin) return 'admin';
    if (currentUser.isModerator) return 'moderator';
    return normalizeRole(currentUser.role);
  }

  if (allUsers && allUsers.length > 0) {
    const found = allUsers.find((u) => u.username && u.username.trim().toLowerCase() === uClean);
    if (found) {
      if (found.isAdmin) return 'admin';
      if (found.isModerator) return 'moderator';
      return normalizeRole(found.role);
    }
  }

  return 'member';
}

interface UserRoleBadgeProps {
  username?: string;
  role?: string;
  allUsers?: User[];
  currentUser?: User | null;
  showText?: boolean;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const UserRoleBadge: React.FC<UserRoleBadgeProps> = ({
  username,
  role,
  allUsers,
  currentUser,
  showText = false,
  size = 'sm',
  className = '',
}) => {
  const effectiveRole = role ? normalizeRole(role) : getUserRole(username, allUsers, currentUser);

  if (effectiveRole === 'member') {
    return null;
  }

  if (effectiveRole === 'ehren pixel') {
    if (!showText) {
      return (
        <span
          className={`inline-flex items-center gap-1 font-extrabold text-cyan-300 bg-cyan-950/80 border border-cyan-400/60 px-1.5 py-0.5 rounded-md shadow-[0_0_10px_rgba(6,182,212,0.4)] select-none align-middle ${
            size === 'xs' ? 'text-[9px] px-1 py-0.2' : size === 'md' ? 'text-xs px-2 py-1' : 'text-[10px]'
          } ${className}`}
          title="Ehrenpixel Mitglied"
        >
          <span className="text-xs">💎</span>
          <span className="font-bold tracking-tight">Ehrenpixel</span>
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 font-black uppercase tracking-wider bg-gradient-to-r from-cyan-950 via-slate-950 to-cyan-950 text-cyan-300 border border-cyan-400/70 px-2.5 py-1 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.4)] select-none ${
          size === 'xs' ? 'text-[9px]' : size === 'md' ? 'text-xs' : 'text-[10px]'
        } ${className}`}
        title="Ehrenpixel Community Member"
      >
        <span className="text-sm">💎</span>
        <span>Ehrenpixel</span>
      </span>
    );
  }

  if (effectiveRole === 'admin') {
    if (!showText) {
      return (
        <span
          className={`inline-flex items-center gap-0.5 text-red-400 font-extrabold bg-red-950/80 border border-red-500/40 px-1.5 py-0.5 rounded-md select-none align-middle ${
            size === 'xs' ? 'text-[9px] px-1 py-0.2' : size === 'md' ? 'text-xs px-2 py-1' : 'text-[10px]'
          } ${className}`}
          title="Administrator"
        >
          <span>👑</span>
          <span className="font-bold tracking-tight">Admin</span>
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-black uppercase tracking-wider bg-red-950/90 text-red-300 border border-red-500/60 px-2.5 py-1 rounded-full shadow-[0_0_12px_rgba(239,68,68,0.3)] select-none ${
          size === 'xs' ? 'text-[9px]' : size === 'md' ? 'text-xs' : 'text-[10px]'
        } ${className}`}
        title="Administrator"
      >
        <span>👑</span>
        <span>Admin</span>
      </span>
    );
  }

  if (effectiveRole === 'moderator') {
    if (!showText) {
      return (
        <span
          className={`inline-flex items-center gap-0.5 text-yellow-400 font-extrabold bg-yellow-950/80 border border-yellow-500/40 px-1.5 py-0.5 rounded-md select-none align-middle ${
            size === 'xs' ? 'text-[9px] px-1 py-0.2' : size === 'md' ? 'text-xs px-2 py-1' : 'text-[10px]'
          } ${className}`}
          title="Moderator"
        >
          <span>🛡️</span>
          <span className="font-bold tracking-tight">Mod</span>
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-black uppercase tracking-wider bg-yellow-950/90 text-yellow-300 border border-yellow-500/60 px-2.5 py-1 rounded-full shadow-[0_0_12px_rgba(234,179,8,0.3)] select-none ${
          size === 'xs' ? 'text-[9px]' : size === 'md' ? 'text-xs' : 'text-[10px]'
        } ${className}`}
        title="Moderator"
      >
        <span>🛡️</span>
        <span>Moderator</span>
      </span>
    );
  }

  return null;
};
