import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-helpers';

// GET: 사용자의 팀 목록 조회
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 사용자 찾기
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        teamMembers: {
          include: {
            team: {
              include: {
                members: {
                  include: {
                    user: true
                  }
                },
                tasks: {
                  orderBy: { createdAt: 'desc' },
                  take: 5
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const teams = user.teamMembers.map(tm => ({
      ...tm.team,
      myRole: tm.role,
      mySubjects: tm.subjects
    }));

    return NextResponse.json({ teams });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST: 새 팀 생성
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, slogan, description, subjects } = await req.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
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

    // 팀 생성
    const team = await prisma.team.create({
      data: {
        name,
        slogan,
        description,
        members: {
          create: {
            userId: user.id,
            role: 'leader',
            subjects: subjects || []
          }
        }
      },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    });

    return NextResponse.json({ team });
  } catch (error) {
    return handleApiError(error);
  }
}