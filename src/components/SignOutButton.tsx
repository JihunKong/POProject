'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      className="px-4 py-2 text-sm font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all duration-200 border border-white/20 hover:border-white/30 flex items-center gap-2"
    >
      <LogOut className="w-4 h-4" />
      <span>로그아웃</span>
    </button>
  );
}