import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { openai, SOCRATIC_SYSTEM_PROMPT } from '@/lib/openai';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  console.log('POST /api/chat - Starting chat request');
  
  try {
    const session = await auth();
    console.log('Session:', { email: session?.user?.email, name: session?.user?.name });
    
    if (!session?.user?.email) {
      console.log('No session or email found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, message } = await req.json();
    console.log('Request body:', { conversationId, messageLength: message?.length });

    // 사용자 찾기 또는 생성
    console.log('Finding user with email:', session.user.email);
    let user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });
    console.log('Found user:', user ? { id: user.id, email: user.email } : 'null');

    if (!user) {
      console.log('User not found, creating new user');
      try {
        user = await prisma.user.create({
          data: {
            email: session.user.email,
            name: session.user.name || null,
            image: session.user.image || null,
          },
        });
        console.log('Created new user:', { id: user.id, email: user.email });
      } catch (createError) {
        console.error('Failed to create user:', createError);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }
    }

    // 대화 기록 조회 또는 생성
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
        userId: user.id,
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

export async function GET() {
  console.log('GET /api/chat - Fetching conversations');
  
  try {
    const session = await auth();
    console.log('Session:', { email: session?.user?.email });
    
    if (!session?.user?.email) {
      console.log('No session or email');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 사용자 찾기 또는 생성
    let user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });
    console.log('Found user:', user ? { id: user.id, email: user.email } : 'null');

    if (!user) {
      console.log('User not found, creating new user');
      try {
        user = await prisma.user.create({
          data: {
            email: session.user.email,
            name: session.user.name || null,
            image: session.user.image || null,
          },
        });
        console.log('Created new user:', { id: user.id, email: user.email });
      } catch (createError) {
        console.error('Failed to create user:', createError);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }
    }

    const conversations = await prisma.conversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        updatedAt: true,
      }
    });
    
    console.log('Found conversations:', conversations.length);

    return NextResponse.json({ conversations });

  } catch (error) {
    console.error('Get conversations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}