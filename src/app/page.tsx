'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Waves, Target, Users, Trophy, MessageSquare } from 'lucide-react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push('/home');
    }
  }, [session, status, router]);

  return (
    <div className="min-h-screen animated-gradient flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-1/2 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-5xl mx-auto">
        <div className="glass-light rounded-3xl shadow-2xl p-8 md:p-12 backdrop-blur-xl">
          {/* Hero section */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-24 h-24 ocean-gradient rounded-3xl shadow-2xl mb-6 float-animation">
              <Waves className="w-14 h-14 text-white drop-shadow-lg" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              <span className="text-gradient-animate">Pure Ocean</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 font-medium mb-2">
              AI 코칭 챗봇과 함께하는 학습 여정
            </p>
            <p className="text-gray-600 max-w-2xl mx-auto">
              소크라테스식 질문을 통해 여러분의 창의적인 아이디어를 발전시켜보세요
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <div className="group card-glass hover:scale-105 transition-all duration-300 p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">SDGs 연계</h3>
              <p className="text-sm text-gray-600">지속가능한 개발목표와 연결된 프로젝트 설계</p>
            </div>

            <div className="group card-glass hover:scale-105 transition-all duration-300 p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">창의적 사고</h3>
              <p className="text-sm text-gray-600">융합적 사고로 혁신적인 해결책 도출</p>
            </div>

            <div className="group card-glass hover:scale-105 transition-all duration-300 p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">팀 협업</h3>
              <p className="text-sm text-gray-600">효과적인 프로젝트 진행과 팀워크 강화</p>
            </div>

            <div className="group card-glass hover:scale-105 transition-all duration-300 p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">해양 보호</h3>
              <p className="text-sm text-gray-600">실천 가능한 해양 환경 보호 방안</p>
            </div>
          </div>

          {/* CTA section */}
          <div className="text-center">
            <button
              onClick={() => signIn('google')}
              className="btn-primary inline-flex items-center gap-3 text-lg px-8 py-4 mb-4"
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
              <span>Google 계정으로 시작하기</span>
            </button>
            <p className="text-sm text-gray-600">
              모든 Google 계정으로 무료로 이용 가능합니다
            </p>
          </div>
        </div>

        {/* Footer with links */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <div className="flex items-center justify-center gap-4">
            <a href="/privacy" className="hover:text-gray-700 transition-colors">
              개인정보 처리방침
            </a>
            <span>•</span>
            <a href="/terms" className="hover:text-gray-700 transition-colors">
              서비스 이용약관
            </a>
          </div>
          <p className="mt-2">© 2025 Pure Ocean Project. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}