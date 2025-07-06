# 대시보드 및 분석 시스템 구현

## 교사용 대시보드

**src/app/dashboard/page.tsx**
```typescript
'use client';

import { useRequireRole } from '@/hooks/useAuth';
import StudentDashboard from '@/components/StudentDashboard';
import TeacherDashboard from '@/components/TeacherDashboard';
import Navigation from '@/components/Navigation';

export default function DashboardPage() {
  const { user, isLoading } = useRequireRole(['STUDENT', 'TEACHER', 'ADMIN']);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {user?.role === 'TEACHER' || user?.role === 'ADMIN' ? (
          <TeacherDashboard />
        ) : (
          <StudentDashboard />
        )}
      </div>
    </div>
  );
}
```

**src/components/TeacherDashboard.tsx**
```typescript
'use client';

import { useQuery } from 'react-query';
import axios from 'axios';
import { useState } from 'react';

interface TeamProgress {
  teamId: string;
  teamName: string;
  members: string[];
  progress: number;
  lastActivity: string;
  status: 'on-track' | 'needs-attention' | 'at-risk';
}

interface Analytics {
  totalStudents: number;
  activeToday: number;
  totalMessages: number;
  averageProgress: number;
  topKeywords: { word: string; count: number }[];
  teamProgressList: TeamProgress[];
}

export default function TeacherDashboard() {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const { data: analytics, isLoading } = useQuery<Analytics>(
    'teacher-analytics',
    async () => {
      const response = await axios.get('/api/analytics/teacher');
      return response.data;
    },
    {
      refetchInterval: 30000, // 30초마다 갱신
    }
  );

  if (isLoading) {
    return <div>데이터를 불러오는 중...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">
        Pure-Ocean Project 대시보드
      </h1>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">전체 학생</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {analytics?.totalStudents || 0}명
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">오늘 활동</h3>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {analytics?.activeToday || 0}명
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">총 대화</h3>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            {analytics?.totalMessages || 0}회
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">평균 진도</h3>
          <p className="text-2xl font-bold text-purple-600 mt-2">
            {analytics?.averageProgress || 0}%
          </p>
        </div>
      </div>

      {/* 팀별 진행 상황 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">팀별 진행 상황</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {analytics?.teamProgressList.map((team) => (
              <div
                key={team.teamId}
                onClick={() => setSelectedTeam(team.teamId)}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{team.teamName}</h3>
                    <p className="text-sm text-gray-500">
                      {team.members.join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        team.status === 'on-track' 
                          ? 'bg-green-100 text-green-800'
                          : team.status === 'needs-attention'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {team.status === 'on-track' && '순조로움'}
                        {team.status === 'needs-attention' && '주의 필요'}
                        {team.status === 'at-risk' && '위험'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      마지막 활동: {new Date(team.lastActivity).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${team.progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{team.progress}% 완료</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 주요 키워드 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">오늘의 주요 키워드</h2>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-2">
            {analytics?.topKeywords.map((keyword) => (
              <span
                key={keyword.word}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {keyword.word} ({keyword.count})
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**src/components/StudentDashboard.tsx**
```typescript
'use client';

import { useQuery } from 'react-query';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import Link from 'next/link';

interface StudentData {
  progress: {
    problemDefinition: boolean;
    research: boolean;
    solutionDevelopment: boolean;
    prototype: boolean;
    presentation: boolean;
  };
  team: {
    name: string;
    members: string[];
    role: string;
  };
  recentActivity: {
    type: string;
    description: string;
    timestamp: string;
  }[];
}

export default function StudentDashboard() {
  const { data: session } = useSession();

  const { data: studentData, isLoading } = useQuery<StudentData>(
    'student-data',
    async () => {
      const response = await axios.get('/api/student/progress');
      return response.data;
    }
  );

  const progressSteps = [
    { key: 'problemDefinition', label: '문제 정의', icon: '🎯' },
    { key: 'research', label: '조사 연구', icon: '🔍' },
    { key: 'solutionDevelopment', label: '해결책 개발', icon: '💡' },
    { key: 'prototype', label: '프로토타입', icon: '🛠️' },
    { key: 'presentation', label: '발표 준비', icon: '📊' },
  ];

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  const completedSteps = Object.values(studentData?.progress || {}).filter(Boolean).length;
  const progressPercentage = (completedSteps / progressSteps.length) * 100;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-2">
          안녕하세요, {session?.user?.name}님! 👋
        </h1>
        <p className="text-gray-600">
          Pure-Ocean Project 진행 상황을 확인하세요.
        </p>
      </div>

      {/* 팀 정보 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">내 팀 정보</h2>
        <div className="space-y-2">
          <p><strong>팀명:</strong> {studentData?.team.name}</p>
          <p><strong>역할:</strong> {studentData?.team.role}</p>
          <p><strong>팀원:</strong> {studentData?.team.members.join(', ')}</p>
        </div>
      </div>

      {/* 진행 상황 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">프로젝트 진행 상황</h2>
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>전체 진행률</span>
            <span>{progressPercentage.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <div className="space-y-3">
          {progressSteps.map((step, index) => {
            const isCompleted = studentData?.progress[step.key as keyof typeof studentData.progress];
            const isActive = index === completedSteps;
            
            return (
              <div
                key={step.key}
                className={`flex items-center p-3 rounded-lg border ${
                  isCompleted
                    ? 'bg-green-50 border-green-300'
                    : isActive
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <span className="text-2xl mr-3">{step.icon}</span>
                <div className="flex-1">
                  <p className={`font-medium ${
                    isCompleted ? 'text-green-800' : 'text-gray-700'
                  }`}>
                    {step.label}
                  </p>
                </div>
                {isCompleted && (
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 빠른 액션 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/chat" className="bg-blue-600 text-white p-6 rounded-lg hover:bg-blue-700 transition text-center">
          <div className="text-3xl mb-2">💬</div>
          <p className="font-medium">AI 도우미와 대화</p>
        </Link>
        
        <Link href="/worksheet" className="bg-green-600 text-white p-6 rounded-lg hover:bg-green-700 transition text-center">
          <div className="text-3xl mb-2">📝</div>
          <p className="font-medium">워크시트 작성</p>
        </Link>
        
        <Link href="/resources" className="bg-purple-600 text-white p-6 rounded-lg hover:bg-purple-700 transition text-center">
          <div className="text-3xl mb-2">📚</div>
          <p className="font-medium">학습 자료</p>
        </Link>
      </div>

      {/* 최근 활동 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">최근 활동</h2>
        <div className="space-y-3">
          {studentData?.recentActivity.map((activity, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">{activity.description}</p>
                <p className="text-xs text-gray-500">
                  {new Date(activity.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

## 분석 API

**src/app/api/analytics/teacher/route.ts**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['TEACHER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 전체 학생 수
    const totalStudents = await prisma.user.count({
      where: { role: 'STUDENT' }
    });

    // 오늘 활동한 학생 수
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeToday = await prisma.user.count({
      where: {
        role: 'STUDENT',
        analytics: {
          some: {
            createdAt: { gte: today }
          }
        }
      }
    });

    // 총 대화 수
    const totalMessages = await prisma.message.count({
      where: { role: 'USER' }
    });

    // 주요 키워드 추출 (간단한 버전)
    const recentMessages = await prisma.message.findMany({
      where: {
        role: 'USER',
        createdAt: { gte: today }
      },
      select: { content: true }
    });

    const wordFrequency = new Map<string, number>();
    const keywords = ['플라스틱', '해양', '쓰레기', '재활용', '생태계', '오염', '미세플라스틱', '어업', '관광', '교육'];
    
    recentMessages.forEach(msg => {
      keywords.forEach(keyword => {
        if (msg.content.includes(keyword)) {
          wordFrequency.set(keyword, (wordFrequency.get(keyword) || 0) + 1);
        }
      });
    });

    const topKeywords = Array.from(wordFrequency.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 팀별 진행 상황 (샘플 데이터 - 실제로는 팀 테이블 필요)
    const teams = [
      {
        teamId: 'team-1',
        teamName: '바다수호대',
        members: ['김민준', '이서연', '박지호'],
        progress: 75,
        lastActivity: new Date().toISOString(),
        status: 'on-track' as const
      },
      {
        teamId: 'team-2',
        teamName: '클린오션',
        members: ['최예진', '정우성', '강민서'],
        progress: 45,
        lastActivity: new Date(Date.now() - 86400000).toISOString(),
        status: 'needs-attention' as const
      },
      {
        teamId: 'team-3',
        teamName: '에코마린',
        members: ['임하늘', '송유진', '김도윤'],
        progress: 20,
        lastActivity: new Date(Date.now() - 172800000).toISOString(),
        status: 'at-risk' as const
      }
    ];

    return NextResponse.json({
      totalStudents,
      activeToday,
      totalMessages,
      averageProgress: 65, // 샘플 값
      topKeywords,
      teamProgressList: teams
    });

  } catch (error) {
    console.error('Teacher analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**src/app/api/analytics/route.ts**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventType, eventData } = await req.json();

    await prisma.analytics.create({
      data: {
        userId: session.user.id,
        eventType,
        eventData,
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const eventType = searchParams.get('eventType');

    const where: any = { userId: session.user.id };

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    if (eventType) {
      where.eventType = eventType;
    }

    const analytics = await prisma.analytics.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return NextResponse.json({ analytics });

  } catch (error) {
    console.error('Get analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**src/app/api/student/progress/route.ts**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 학생 진행 상황 조회 (실제로는 별도 테이블 필요)
    const progress = {
      problemDefinition: true,
      research: true,
      solutionDevelopment: true,
      prototype: false,
      presentation: false,
    };

    // 팀 정보 (샘플)
    const team = {
      name: '바다수호대',
      members: ['김민준', '이서연', '박지호', session.user.name || '나'],
      role: '연구 담당'
    };

    // 최근 활동
    const recentActivity = await prisma.analytics.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        eventType: true,
        eventData: true,
        createdAt: true
      }
    });

    const formattedActivity = recentActivity.map(activity => ({
      type: activity.eventType,
      description: getActivityDescription(activity.eventType, activity.eventData),
      timestamp: activity.createdAt.toISOString()
    }));

    return NextResponse.json({
      progress,
      team,
      recentActivity: formattedActivity
    });

  } catch (error) {
    console.error('Student progress error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getActivityDescription(eventType: string, eventData: any): string {
  switch (eventType) {
    case 'chat_message':
      return 'AI 도우미와 대화를 나눴습니다';
    case 'document_feedback':
      return `${eventData?.documentType || '문서'}에 대한 피드백을 받았습니다`;
    case 'worksheet_update':
      return '워크시트를 업데이트했습니다';
    default:
      return '프로젝트 활동을 수행했습니다';
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { progressUpdate } = await req.json();

    // 진행 상황 업데이트 로직
    await prisma.analytics.create({
      data: {
        userId: session.user.id,
        eventType: 'progress_update',
        eventData: progressUpdate
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Update progress error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## 네비게이션 컴포넌트

**src/components/Navigation.tsx**
```typescript
'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: '대시보드', icon: '📊' },
    { href: '/chat', label: 'AI 도우미', icon: '💬' },
    { href: '/worksheet', label: '워크시트', icon: '📝' },
    { href: '/resources', label: '학습자료', icon: '📚' },
  ];

  if (session?.user?.role === 'TEACHER' || session?.user?.role === 'ADMIN') {
    navItems.push({ href: '/admin', label: '관리', icon: '⚙️' });
  }

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <span className="text-2xl">🌊</span>
              <span className="font-bold text-xl">Pure-Ocean</span>
            </Link>
            
            <div className="hidden md:flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition ${
                    pathname === item.href
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <img
                src={session?.user?.image || '/default-avatar.png'}
                alt="Profile"
                className="w-8 h-8 rounded-full"
              />
              <span className="text-sm font-medium">{session?.user?.name}</span>
              <span className="text-xs text-gray-500">
                ({session?.user?.role === 'TEACHER' ? '교사' : '학생'})
              </span>
            </div>
            
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
```

## 실시간 모니터링 컴포넌트

**src/components/RealtimeMonitor.tsx**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';

interface RealtimeData {
  activeUsers: number;
  currentChats: number;
  systemHealth: 'good' | 'warning' | 'critical';
  recentErrors: { message: string; timestamp: string }[];
}

export default function RealtimeMonitor() {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data, refetch } = useQuery<RealtimeData>(
    'realtime-monitor',
    async () => {
      const response = await axios.get('/api/monitor/realtime');
      return response.data;
    },
    {
      refetchInterval: 5000, // 5초마다 갱신
      enabled: isExpanded,
    }
  );

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'good': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
      ) : (
        <div className="bg-white rounded-lg shadow-xl p-4 w-80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">실시간 모니터링</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">활성 사용자</span>
              <span className="font-medium">{data?.activeUsers || 0}명</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">진행중인 대화</span>
              <span className="font-medium">{data?.currentChats || 0}개</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">시스템 상태</span>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${getHealthColor(data?.systemHealth || 'good')}`}></div>
                <span className="text-sm font-medium">
                  {data?.systemHealth === 'good' && '정상'}
                  {data?.systemHealth === 'warning' && '주의'}
                  {data?.systemHealth === 'critical' && '위험'}
                </span>
              </div>
            </div>

            {data?.recentErrors && data.recentErrors.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm font-medium text-red-600 mb-2">최근 오류</p>
                <div className="space-y-1">
                  {data.recentErrors.slice(0, 3).map((error, index) => (
                    <div key={index} className="text-xs text-gray-600">
                      <p className="truncate">{error.message}</p>
                      <p className="text-gray-400">{new Date(error.timestamp).toLocaleTimeString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```