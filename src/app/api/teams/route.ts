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
        teams: {
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

    const teams = user.teams.map(tm => ({
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
  console.log('POST /api/teams - Creating new team');
  
  try {
    const session = await auth();
    console.log('Session:', session);
    
    if (!session?.user?.email) {
      console.log('No session or email found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, slogan, description, subjects } = await req.json();
    console.log('Request body:', { name, slogan, description, subjects });
    
    if (!name) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    // 사용자 찾기 또는 생성
    console.log('Finding or creating user for email:', session.user.email);
    let user;
    
    try {
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });
      console.log('Found user:', user);
    } catch (dbError) {
      console.error('Database error finding user:', dbError);
      throw new Error(`Failed to find user: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }

    if (!user) {
      console.log('Creating new user');
      try {
        user = await prisma.user.create({
          data: {
            email: session.user.email,
            name: session.user.name || null,
            image: session.user.image || null,
          },
        });
        console.log('Created user:', user);
      } catch (createError) {
        console.error('Database error creating user:', createError);
        throw new Error(`Failed to create user: ${createError instanceof Error ? createError.message : 'Unknown error'}`);
      }
    }

    // 팀 생성
    console.log('Creating team with userId:', user.id);
    try {
      const team = await prisma.team.create({
        data: {
          name,
          slogan: slogan || null,
          description: description || null,
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
      console.log('Created team:', team);
      return NextResponse.json({ team });
    } catch (teamError) {
      console.error('Database error creating team:', teamError);
      throw new Error(`Failed to create team: ${teamError instanceof Error ? teamError.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error in POST /api/teams:', error);
    return handleApiError(error);
  }
}