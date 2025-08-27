import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { openai, DEFAULT_MODEL } from '@/lib/openai';
import { prisma } from '@/lib/prisma';
import { loadProjectDocuments, getRelevantContext } from '@/lib/rag';
import { handleApiError } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, conversationId } = await req.json();
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 프로젝트 문서 로드
    const documents = loadProjectDocuments();
    
    // 관련 컨텍스트 검색
    const context = getRelevantContext(message, documents, 5);

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
          title: message.slice(0, 50) + '...',
        },
        include: { messages: true }
      });
    }

    // 사용자 메시지 저장
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER' as const,
        content: message,
      },
    });

    // Build complete message history including conversation context
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

    // Include conversation history for context continuity
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversation.messages.map((msg: any) => ({
        role: msg.role.toLowerCase() as 'user' | 'assistant',
        content: msg.content
      })),
      { role: "user", content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const assistantMessage = completion.choices[0].message.content || '죄송합니다. 응답을 생성할 수 없습니다.';

    // AI 응답 저장
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT' as const,
        content: assistantMessage,
      },
    });

    // 대화 제목 업데이트
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      conversationId: conversation.id,
      message: assistantMessage,
    });
  } catch (error) {
    return handleApiError(error);
  }
}