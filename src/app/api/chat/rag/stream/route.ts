import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { openai, DEFAULT_MODEL } from '@/lib/openai';
import { prisma } from '@/lib/prisma';
import { loadProjectDocuments, getRelevantContext } from '@/lib/rag';

export async function POST(req: NextRequest) {
  console.log('POST /api/chat/rag/stream - Starting streaming RAG request');
  
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { message, conversationId } = await req.json();
    if (!message) {
      return new Response('Message is required', { status: 400 });
    }

    console.log('RAG Stream request:', { messageLength: message.length, conversationId });

    // 프로젝트 문서 로드 및 관련 컨텍스트 검색
    const documents = loadProjectDocuments();
    const context = getRelevantContext(message, documents, 5);
    console.log('Retrieved context chunks:', context.length);

    // 사용자 찾기 또는 생성
    let user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
        },
      });
    }

    // 대화 생성 또는 가져오기
    let conversation;
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
        include: { messages: true },
      });
    }

    // 사용자 메시지 저장
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: message,
      },
    });

    // 분석 데이터 저장
    await prisma.analytics.create({
      data: {
        userId: user.id,
        eventType: 'rag_query',
        eventData: {
          conversationId: conversation.id,
          messageLength: message.length,
          contextChunks: context.length,
          timestamp: new Date().toISOString(),
        }
      }
    });

    // RAG 시스템 프롬프트 구성
    const systemPrompt = `당신은 완도고등학교 Pure Ocean 학생들을 위한 프로젝트 도우미입니다.
    
주어진 컨텍스트를 바탕으로 학생들의 질문에 친절하고 구체적으로 답변해주세요.
프로젝트 진행에 도움이 되는 실용적인 조언을 제공하세요.

컨텍스트:
${context}

중요 지침:
1. 항상 한국어로 답변하세요
2. 학생 수준에 맞게 쉽게 설명하세요
3. 구체적인 예시를 들어주세요
4. 긍정적이고 격려하는 톤을 유지하세요
5. 컨텍스트에 없는 정보는 일반적인 지식을 바탕으로 답변하되, 추측임을 명시하세요
6. 이전 대화 내용을 고려하여 연속성 있는 답변을 제공하세요`;

    // 이전 대화 메시지 구성
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversation.messages.map(msg => ({
        role: msg.role.toLowerCase() as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user' as const, content: message }
    ];

    // 스트리밍 응답 설정
    const stream = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1500,
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
                conversationId: conversation.id
              });
              
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          // 완료 메시지 전송
          const endData = JSON.stringify({
            type: 'complete',
            conversationId: conversation.id,
            fullMessage
          });
          controller.enqueue(encoder.encode(`data: ${endData}\n\n`));
          
          // AI 응답 저장
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              role: 'ASSISTANT',
              content: fullMessage,
            },
          });

        } catch (error) {
          console.error('RAG streaming error:', error);
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
    console.error('RAG stream API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}