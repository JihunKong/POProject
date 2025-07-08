'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, Users, FileText, Brain, Target, Lightbulb } from 'lucide-react';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const features = [
    {
      icon: MessageSquare,
      title: 'AI 챗봇',
      description: 'GROW 코칭, 프로젝트 도우미, 문서 첨삭 기능',
      href: '/chat',
      color: 'bg-blue-500'
    },
    {
      icon: Users,
      title: '팀 관리',
      description: '팀 생성, 작업 관리, 진행 상황 추적',
      href: '/teams',
      color: 'bg-green-500'
    },
    {
      icon: FileText,
      title: '문서 작업',
      description: '워크시트 작성 및 AI 피드백',
      href: '/chat?mode=docs',
      color: 'bg-purple-500'
    }
  ];

  const projectPhases = [
    { day: 'Day 1', title: '문제 정의', icon: Target },
    { day: 'Day 2', title: '아이디어 도출', icon: Lightbulb },
    { day: 'Day 3', title: '프로토타입', icon: Brain },
    { day: 'Day 4', title: '테스트 및 개선', icon: MessageSquare },
    { day: 'Day 5', title: '발표 준비', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Pure Ocean Project에 오신 것을 환영합니다
          </h1>
          <p className="text-xl text-gray-600">
            {session?.user?.name || session?.user?.email}님, 오늘도 멋진 프로젝트를 만들어봐요!
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.title}
                href={feature.href}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-6"
              >
                <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </Link>
            );
          })}
        </div>

        {/* Project Timeline */}
        <div className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">프로젝트 진행 단계</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {projectPhases.map((phase, index) => {
              const Icon = phase.icon;
              return (
                <div key={phase.day} className="text-center">
                  <div className="relative">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Icon className="w-8 h-8 text-blue-600" />
                    </div>
                    {index < projectPhases.length - 1 && (
                      <div className="hidden md:block absolute top-8 left-16 w-full h-0.5 bg-gray-300" />
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900">{phase.day}</h3>
                  <p className="text-sm text-gray-600">{phase.title}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">5</div>
            <div className="text-gray-600">프로젝트 단계</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-green-600">3</div>
            <div className="text-gray-600">AI 챗봇 기능</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-purple-600">∞</div>
            <div className="text-gray-600">창의적 아이디어</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-orange-600">1</div>
            <div className="text-gray-600">깨끗한 바다</div>
          </div>
        </div>
      </div>
    </div>
  );
}