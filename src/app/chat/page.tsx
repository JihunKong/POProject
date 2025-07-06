'use client';

import ChatInterface from '@/components/ChatInterface';
import SignOutButton from '@/components/SignOutButton';
import { useAuth } from '@/hooks/useAuth';

export default function ChatPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ocean-blue-50 to-ocean-blue-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Pure-Ocean Project
              </h1>
              <p className="text-sm text-gray-500">
                {user?.name || user?.email} ({user?.role})
              </p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>
      
      {/* Chat Interface */}
      <div className="flex-1 flex">
        <ChatInterface />
      </div>
    </div>
  );
}