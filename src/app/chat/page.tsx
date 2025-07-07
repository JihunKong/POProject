'use client';

import ChatInterface from '@/components/ChatInterface';
import SignOutButton from '@/components/SignOutButton';
import { useAuth } from '@/hooks/useAuth';

export default function ChatPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen animated-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="loading-wave text-white mb-4">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p className="text-white/80 font-medium">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col ocean-gradient-mesh">
      {/* Header */}
      <header className="glass backdrop-blur-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 ocean-gradient rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">🌊</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  Pure Ocean
                </h1>
                <p className="text-sm text-white/80">
                  {user?.name || user?.email} • {user?.role}
                </p>
              </div>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>
      
      {/* Chat Interface */}
      <div className="flex-1 w-full overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
}