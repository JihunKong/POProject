import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-helpers';

// PATCH: 작업 업데이트
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
    const updates = await req.json();

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

    // 작업 업데이트
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(updates.title && { title: updates.title }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.status && { status: updates.status }),
        ...(updates.dueDate !== undefined && { 
          dueDate: updates.dueDate ? new Date(updates.dueDate) : null 
        }),
        ...(updates.assignedTo && { 
          assignedTo: updates.assignedTo,
          assignees: {
            set: updates.assignedTo.map((id: string) => ({ id }))
          }
        }),
      },
      include: {
        assignees: {
          include: {
            user: true
          }
        }
      }
    });

    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE: 작업 삭제
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

    // 사용자가 팀 리더인지 확인
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

    if (!teamMember || teamMember.role !== 'leader') {
      return NextResponse.json({ error: 'Only team leader can delete tasks' }, { status: 403 });
    }

    // 작업 삭제
    await prisma.task.delete({
      where: { id: taskId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}