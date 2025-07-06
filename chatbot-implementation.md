# AI 챗봇 시스템 구현 코드

## OpenAI 설정

**src/lib/openai.ts**
```typescript
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const SOCRATIC_SYSTEM_PROMPT = `당신은 완도고등학교 Pure-Ocean Project를 진행하는 고등학생들을 위한 소크라테스식 코칭 챗봇입니다.

역할:
- 공동체의 문제를 찾아 융합적 사고를 통해 해결하는 프로젝트를 진행하는 학생들에게 질문을 통해 스스로 답을 찾도록 안내
- 직접적인 답변보다는 사고를 자극하는 질문 제시
- 학생들의 창의성과 비판적 사고력 향상 지원

대화 원칙:
1. 직접적인 해답 제시 금지 (단, 안전이나 법적 문제 제외)
2. "왜 그렇게 생각하나요?", "어떤 근거가 있나요?" 등의 탐구적 질문 활용
3. 학생이 막힐 때는 작은 힌트나 다른 관점 제시
4. 항상 격려하고 지지하는 톤 유지
5. 답변은 100단어 이내로 간결하게

질문 유형:
- 명확화: "~을 좀 더 구체적으로 설명해 줄 수 있나요?"
- 가정 검토: "어떤 전제를 가지고 접근하고 있나요?"
- 증거 요구: "그 아이디어를 뒷받침하는 자료나 사례가 있나요?"
- 관점 전환: "다른 이해관계자의 입장에서는 어떻게 볼까요?"
- 결과 예측: "이 방법을 적용하면 어떤 변화가 생길까요?"

프로젝트 관련 정보:
- SDGs 목표를 모둠에서 정해 세부적으로 자신의 진로와 흥미에 맞게 분산하여 다각도에서 해결
- 학생 주변의 다양한 규모의 공동체에 대해 사고
- 실행 가능하고 지속가능한 해결책 지향`;

export const FEEDBACK_SYSTEM_PROMPT = `당신은 완도고등학교 Pure-Ocean Project 문서를 검토하는 AI 조교입니다.

역할:
- 학생들의 워크시트, PPT, 보고서에 건설적인 피드백 제공
- 파란색으로 표시될 코멘트 작성
- 개선점과 잘한 점을 균형있게 제시

피드백 원칙:
1. 구체적이고 실행 가능한 제안
2. 긍정적인 부분 먼저 언급
3. 개선점은 "~하면 더 좋을 것 같아요" 형식으로
4. 학생 수준에 맞는 용어 사용
5. 각 섹션별로 1-2개의 핵심 피드백

평가 기준:
- 문제 정의의 명확성
- SDGs 연계성
- 해결책의 실현 가능성
- 팀워크와 역할 분담
- 자료의 신뢰성`;
```

## 채팅 API 라우트

**src/app/api/chat/route.ts**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { openai, SOCRATIC_SYSTEM_PROMPT } from '@/lib/openai';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, message } = await req.json();

    // 대화 기록 저장
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId, userId: session.user.id },
        include: { messages: { orderBy: { createdAt: 'asc' } } }
      });
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId: session.user.id,
          title: message.substring(0, 50),
        },
        include: { messages: true }
      });
    }

    // 사용자 메시지 저장
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: message,
      }
    });

    // 분석 데이터 저장
    await prisma.analytics.create({
      data: {
        userId: session.user.id,
        eventType: 'chat_message',
        eventData: {
          conversationId: conversation.id,
          messageLength: message.length,
          timestamp: new Date().toISOString(),
        }
      }
    });

    // OpenAI API 호출
    const messages = [
      { role: 'system' as const, content: SOCRATIC_SYSTEM_PROMPT },
      ...conversation.messages.map(msg => ({
        role: msg.role.toLowerCase() as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user' as const, content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 150,
    });

    const assistantMessage = completion.choices[0].message.content || '';

    // AI 응답 저장
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: assistantMessage,
      }
    });

    return NextResponse.json({
      conversationId: conversation.id,
      message: assistantMessage,
    });

  } catch (error) {
    console.error('Chat API error:', error);
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

    const conversations = await prisma.conversation.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        updatedAt: true,
      }
    });

    return NextResponse.json({ conversations });

  } catch (error) {
    console.error('Get conversations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## 채팅 인터페이스 컴포넌트

**src/components/ChatInterface.tsx**
```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery } from 'react-query';
import axios from 'axios';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

export default function ChatInterface() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const { data: conversationsData, refetch: refetchConversations } = useQuery(
    'conversations',
    async () => {
      const response = await axios.get('/api/chat');
      return response.data.conversations as Conversation[];
    },
    {
      enabled: !!session,
    }
  );

  const sendMessage = useMutation(
    async (message: string) => {
      const response = await axios.post('/api/chat', {
        conversationId,
        message,
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        setConversationId(data.conversationId);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        }]);
        refetchConversations();
      },
      onError: (error) => {
        console.error('메시지 전송 오류:', error);
        alert('메시지 전송에 실패했습니다.');
      },
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    sendMessage.mutate(input);
  };

  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
  };

  return (
    <div className="flex h-full">
      {/* 사이드바 - 대화 목록 */}
      <div className="w-64 bg-gray-100 p-4 overflow-y-auto">
        <button
          onClick={startNewConversation}
          className="w-full mb-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          새 대화 시작
        </button>
        
        <h3 className="text-sm font-semibold text-gray-600 mb-2">최근 대화</h3>
        <div className="space-y-2">
          {conversationsData?.map((conv) => (
            <button
              key={conv.id}
              onClick={() => {
                setConversationId(conv.id);
                // 대화 내용 로드 로직 추가 필요
              }}
              className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-200 transition ${
                conversationId === conv.id ? 'bg-gray-200' : ''
              }`}
            >
              <div className="truncate">{conv.title}</div>
              <div className="text-xs text-gray-500">
                {new Date(conv.updatedAt).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 메인 채팅 영역 */}
      <div className="flex-1 flex flex-col">
        {/* 헤더 */}
        <div className="bg-white border-b px-6 py-4">
          <h2 className="text-xl font-semibold">Pure-Ocean 프로젝트 도우미</h2>
          <p className="text-sm text-gray-600">
            질문을 통해 여러분의 생각을 발전시켜 드릴게요!
          </p>
        </div>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              <p className="text-lg mb-4">안녕하세요! 무엇을 도와드릴까요?</p>
              <div className="space-y-2 text-sm">
                <p>💡 "해양 플라스틱 문제를 어떻게 접근하면 좋을까요?"</p>
                <p>🌊 "우리 지역 바다의 특별한 문제가 있을까요?"</p>
                <p>🎯 "프로젝트 목표를 어떻게 설정하면 좋을까요?"</p>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-md px-4 py-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border shadow-sm'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {sendMessage.isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border shadow-sm px-4 py-3 rounded-lg">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 입력 영역 */}
        <form onSubmit={handleSubmit} className="p-4 bg-white border-t">
          <div className="flex space-x-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="궁금한 점을 물어보세요..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sendMessage.isLoading}
            />
            <button
              type="submit"
              disabled={sendMessage.isLoading || !input.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              전송
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

## 문서 피드백 API

**src/app/api/feedback/route.ts**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { openai, FEEDBACK_SYSTEM_PROMPT } from '@/lib/openai';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentType, content, sections } = await req.json();

    // 문서 타입별 프롬프트 조정
    let specificPrompt = FEEDBACK_SYSTEM_PROMPT;
    if (documentType === 'worksheet') {
      specificPrompt += '\n\n워크시트 검토 시 특히 문제 정의의 명확성과 해결책의 구체성에 중점을 두세요.';
    } else if (documentType === 'presentation') {
      specificPrompt += '\n\nPPT 검토 시 시각적 효과와 스토리텔링의 일관성도 평가하세요.';
    }

    // 섹션별 피드백 생성
    const feedbackPromises = sections.map(async (section: any) => {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: specificPrompt },
          { 
            role: 'user', 
            content: `다음 섹션에 대해 피드백을 제공해주세요:\n\n제목: ${section.title}\n내용: ${section.content}`
          }
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      return {
        sectionId: section.id,
        feedback: completion.choices[0].message.content || '',
      };
    });

    const feedbacks = await Promise.all(feedbackPromises);

    // 피드백 기록 저장
    await prisma.analytics.create({
      data: {
        userId: session.user.id,
        eventType: 'document_feedback',
        eventData: {
          documentType,
          sectionsCount: sections.length,
          timestamp: new Date().toISOString(),
        }
      }
    });

    return NextResponse.json({ feedbacks });

  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## 채팅 페이지

**src/app/chat/page.tsx**
```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';
import ChatInterface from '@/components/ChatInterface';
import Navigation from '@/components/Navigation';

export default function ChatPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <div className="flex-1 flex">
        <ChatInterface />
      </div>
    </div>
  );
}
```