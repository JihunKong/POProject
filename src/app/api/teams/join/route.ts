import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-helpers';

// POST: 초대 코드로 팀 가입
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { inviteCode, subjects } = await req.json();
    
    if (!inviteCode) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    // 팀 찾기
    const team = await prisma.team.findUnique({
      where: { inviteCode },
      include: {
        members: true
      }
    });

    if (!team) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

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

    // 이미 팀 멤버인지 확인
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: team.id,
          userId: user.id
        }
      }
    });

    if (existingMember) {
      return NextResponse.json({ error: 'Already a member of this team' }, { status: 400 });
    }

    // 팀 멤버 추가
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: user.id,
        role: 'member',
        subjects: subjects || []
      }
    });

    // 팀 정보 반환
    const updatedTeam = await prisma.team.findUnique({
      where: { id: team.id },
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