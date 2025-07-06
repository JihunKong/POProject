'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push('/chat');
    }
  }, [session, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ocean-blue-50 to-ocean-blue-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center p-4">
      {/* 배경 장식 요소 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-200 rounded-full opacity-20 blur-3xl"></div>
      </div>
      
      <div className="relative bg-white/90 backdrop-blur-lg p-10 rounded-3xl shadow-2xl max-w-md w-full border border-white/50">
        {/* 로고/아이콘 영역 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg mb-4">
            <span className="text-3xl">🌊</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
            Pure-Ocean Project
          </h1>
          <p className="text-gray-600 font-medium">
            AI 코칭 챗봇과 함께하는 해양 프로젝트
          </p>
        </div>

        <div className="space-y-6">
          <p className="text-gray-700 text-center leading-relaxed">
            소크라테스식 질문을 통해 여러분의 프로젝트를 도와드립니다.
            해양 환경 보호를 위한 창의적인 아이디어를 함께 발전시켜봐요!
          </p>

          {/* 기능 카드 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-2xl border border-blue-200">
              <div className="text-2xl mb-2">🎯</div>
              <h3 className="font-semibold text-blue-900 text-sm mb-1">SDGs 연계</h3>
              <p className="text-xs text-blue-700">지속가능한 목표 설계</p>
            </div>
            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-2xl border border-cyan-200">
              <div className="text-2xl mb-2">💡</div>
              <h3 className="font-semibold text-cyan-900 text-sm mb-1">창의적 사고</h3>
              <p className="text-xs text-cyan-700">융합적 문제 해결</p>
            </div>
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-2xl border border-teal-200">
              <div className="text-2xl mb-2">🤝</div>
              <h3 className="font-semibold text-teal-900 text-sm mb-1">팀 협업</h3>
              <p className="text-xs text-teal-700">프로젝트 진행 관리</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-2xl border border-indigo-200">
              <div className="text-2xl mb-2">🌊</div>
              <h3 className="font-semibold text-indigo-900 text-sm mb-1">해양 보호</h3>
              <p className="text-xs text-indigo-700">실행 가능한 해결책</p>
            </div>
          </div>

          {/* 로그인 버튼 */}
          <button
            onClick={() => signIn('google')}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 px-6 rounded-2xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 font-semibold flex items-center justify-center gap-3 group"
          >
            <div className="bg-white p-2 rounded-lg group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </div>
            Google 계정으로 시작하기
          </button>

          <p className="text-xs text-gray-500 text-center">
            모든 Google 계정으로 로그인 가능합니다
          </p>
        </div>
      </div>
    </div>
  );
}