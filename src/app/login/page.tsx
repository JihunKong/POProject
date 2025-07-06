'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/chat';

  return (
    <div className="min-h-screen animated-gradient flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-20 w-64 h-64 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute top-1/2 right-20 w-72 h-72 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>
      
      <div className="relative z-10 w-full max-w-md">
        <div className="glass-light rounded-3xl shadow-2xl p-10 backdrop-blur-xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl shadow-2xl mb-6 pulse-animation">
              <span className="text-3xl drop-shadow-lg">🔐</span>
            </div>
            <h1 className="text-4xl font-bold mb-3">
              <span className="text-gradient-animate">로그인이 필요합니다</span>
            </h1>
            <p className="text-gray-600 text-lg">
              Pure Ocean 챗봇을 사용하려면 로그인해주세요
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => signIn('google', { callbackUrl })}
              className="btn-primary w-full flex items-center justify-center gap-3 text-lg"
            >
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#ffffff"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#ffffff"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#ffffff"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#ffffff"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </div>
              <span>Google 계정으로 로그인</span>
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300/50"></span>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white/50 backdrop-blur-sm text-gray-600 rounded-full">
                  안전한 로그인
                </span>
              </div>
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                모든 Google 계정으로 로그인 가능합니다
              </p>
              <p className="text-xs text-gray-500">
                귀하의 정보는 안전하게 보호됩니다
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
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
    }>
      <LoginContent />
    </Suspense>
  );
}