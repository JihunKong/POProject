import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-helpers';

// GET: 팀의 작업 목록 조회
export async function GET(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = params;

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

    // 작업 목록 조회
    const tasks = await prisma.task.findMany({
      where: { teamId },
      include: {
        assignees: {
          include: {
            user: true
          }
        }
      },
      orderBy: [
        { phase: 'asc' },
        { status: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST: 새 작업 생성
export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = params;
    const { title, description, phase, category, dueDate, assignedTo } = await req.json();

    if (!title || !phase || !category) {
      return NextResponse.json({ 
        error: 'Title, phase, and category are required' 
      }, { status: 400 });
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

    // 작업 생성
    const task = await prisma.task.create({
      data: {
        teamId,
        title,
        description,
        phase,
        category,
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedTo: assignedTo || [],
        createdBy: user.id,
        assignees: {
          connect: assignedTo?.map((id: string) => ({ id })) || []
        }
      },
      include: {
        assignees: {
          include: {
            user: true
          }
        }
      }
    });

    return NextResponse.json({ task });
  } catch (error) {
    return handleApiError(error);
  }
}