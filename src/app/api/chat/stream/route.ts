import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { openai, SOCRATIC_SYSTEM_PROMPT, DEFAULT_MODEL } from '@/lib/openai';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  console.log('POST /api/chat/stream - Starting streaming chat request');
  
  try {
    const session = await auth();
    console.log('Session:', { email: session?.user?.email, name: session?.user?.name });
    
    if (!session?.user?.email) {
      console.log('No session or email found');
      return new Response('Unauthorized', { status: 401 });
    }

    const { conversationId, message, assistantMode } = await req.json();
    console.log('Request body:', { conversationId, messageLength: message?.length, assistantMode });

    // 사용자 찾기 또는 생성
    let user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name || null,
          image: session.user.image || null,
        },
      });
    }

    // 대화 기록 조회 또는 생성 (코칭 모드가 아닐 때만)
    let conversation = null;
    if (assistantMode !== 'coaching') {
      if (conversationId) {
        conversation = await prisma.conversation.findUnique({
          where: { id: conversationId, userId: user.id },
          include: { messages: { orderBy: { createdAt: 'asc' } } }
        });
      }

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            userId: user.id,
            title: message.substring(0, 50),
          },
          include: { messages: true }
        });
      }

      // 사용자 메시지 저장 (코칭 모드가 아닐 때만)
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'USER',
          content: message,
        }
      });
    }

    // 분석 데이터 저장
    await prisma.analytics.create({
      data: {
        userId: user.id,
        eventType: 'chat_message',
        eventData: {
          conversationId: conversation?.id || 'coaching-session',
          messageLength: message.length,
          timestamp: new Date().toISOString(),
          assistantMode,
        }
      }
    });

    // OpenAI API 메시지 구성
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system' as const, content: SOCRATIC_SYSTEM_PROMPT },
    ];

    // 코칭 모드가 아닐 때만 이전 대화 포함
    if (conversation && assistantMode !== 'coaching') {
      messages.push(...conversation.messages.map(msg => ({
        role: msg.role.toLowerCase() as 'user' | 'assistant',
        content: msg.content
      })));
    }

    messages.push({ role: 'user' as const, content: message });

    // 스트리밍 응답 설정
    const stream = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    });

    // ReadableStream 생성
    const encoder = new TextEncoder();
    let fullMessage = '';

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullMessage += content;
              
              // SSE 형식으로 데이터 전송
              const data = JSON.stringify({
                content,
                type: 'chunk',
                conversationId: conversation?.id || null
              });
              
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          // 완료 메시지 전송
          const endData = JSON.stringify({
            type: 'complete',
            conversationId: conversation?.id || null,
            fullMessage
          });
          controller.enqueue(encoder.encode(`data: ${endData}\n\n`));
          
          // AI 응답 저장 (코칭 모드가 아닐 때만)
          if (conversation && assistantMode !== 'coaching') {
            await prisma.message.create({
              data: {
                conversationId: conversation.id,
                role: 'ASSISTANT',
                content: fullMessage,
              }
            });
          }

        } catch (error) {
          console.error('Streaming error:', error);
          const errorData = JSON.stringify({
            type: 'error',
            error: 'Streaming failed'
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat stream API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}