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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ocean-blue-50 to-ocean-blue-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-ocean-blue-800 mb-2">
            Pure-Ocean Project
          </h1>
          <p className="text-ocean-blue-600">
            완도고등학교 AI 코칭 챗봇
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-gray-600 text-center">
            소크라테스식 질문을 통해 여러분의 프로젝트를 도와드립니다.
            해양 환경 보호를 위한 창의적인 아이디어를 함께 발전시켜봐요!
          </p>

          <div className="bg-ocean-blue-50 p-4 rounded-lg">
            <h2 className="font-semibold text-ocean-blue-800 mb-2">
              🌊 주요 기능
            </h2>
            <ul className="space-y-1 text-sm text-ocean-blue-700">
              <li>• SDGs 목표와 연계한 프로젝트 설계</li>
              <li>• 융합적 사고력 향상을 위한 질문</li>
              <li>• 실행 가능한 해결책 도출 지원</li>
              <li>• 팀 프로젝트 진행 상황 관리</li>
            </ul>
          </div>

          <button
            onClick={() => signIn('google')}
            className="w-full bg-ocean-blue-600 text-white py-3 px-4 rounded-lg hover:bg-ocean-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google 계정으로 로그인
          </button>

          <p className="text-xs text-gray-500 text-center">
            ※ 모든 Google 계정으로 로그인 가능합니다
          </p>
        </div>
      </div>
    </div>
  );
}