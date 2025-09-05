import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-helpers';

// POST: 체크리스트 아이템 추가
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ teamId: string; taskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId, taskId } = await context.params;
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // 사용자가 팀 멤버인지 확인
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: user.id
        }
      }
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    // 작업이 해당 팀의 것인지 확인
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        teamId
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // 현재 최대 order 값 찾기
    const maxOrder = await prisma.taskChecklistItem.findFirst({
      where: { taskId },
      orderBy: { order: 'desc' },
      select: { order: true }
    });

    // 체크리스트 아이템 생성
    const checklistItem = await prisma.taskChecklistItem.create({
      data: {
        taskId,
        text,
        order: (maxOrder?.order ?? -1) + 1
      }
    });

    return NextResponse.json({ checklistItem });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH: 체크리스트 아이템 업데이트 (완료 상태 토글)
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ teamId: string; taskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId, taskId } = await context.params;
    const { itemId, completed, text } = await req.json();

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    // 사용자가 팀 멤버인지 확인
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: user.id
        }
      }
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    // 체크리스트 아이템이 해당 task의 것인지 확인
    const checklistItem = await prisma.taskChecklistItem.findFirst({
      where: {
        id: itemId,
        taskId
      }
    });

    if (!checklistItem) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
    }

    // 업데이트
    const updatedItem = await prisma.taskChecklistItem.update({
      where: { id: itemId },
      data: {
        ...(completed !== undefined && { completed }),
        ...(text !== undefined && { text })
      }
    });

    return NextResponse.json({ checklistItem: updatedItem });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE: 체크리스트 아이템 삭제
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ teamId: string; taskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId, taskId } = await context.params;
    const { itemId } = await req.json();

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    // 사용자가 팀 멤버인지 확인
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: user.id
        }
      }
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    // 체크리스트 아이템이 해당 task의 것인지 확인
    const checklistItem = await prisma.taskChecklistItem.findFirst({
      where: {
        id: itemId,
        taskId
      }
    });

    if (!checklistItem) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
    }

    // 삭제
    await prisma.taskChecklistItem.delete({
      where: { id: itemId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}