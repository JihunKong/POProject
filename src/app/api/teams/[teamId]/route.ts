import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-helpers';

// GET: 팀 상세 정보 조회
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = await context.params;

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

    // 팀 정보 조회
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json({ team });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH: 팀 정보 업데이트
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = await context.params;
    const updates = await req.json();

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
      return NextResponse.json({ error: 'Only team leader can update team info' }, { status: 403 });
    }

    // 팀 정보 업데이트
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.slogan !== undefined && { slogan: updates.slogan }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.projectGoal !== undefined && { projectGoal: updates.projectGoal })
      },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    });

    return NextResponse.json({ team: updatedTeam });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE: 팀 삭제
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = await context.params;

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
      return NextResponse.json({ error: 'Only team leader can delete team' }, { status: 403 });
    }

    // 팀 삭제 (연관된 모든 데이터도 cascade로 삭제됨)
    await prisma.team.delete({
      where: { id: teamId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}