import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { openai } from '@/lib/openai';
import { handleApiError } from '@/lib/api-helpers';

// POST: AI 역할 추천
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  console.log('POST /api/teams/[teamId]/recommend-roles - Starting');
  
  try {
    const session = await auth();
    console.log('Session:', session);
    
    if (!session?.user?.email) {
      console.log('No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = await context.params;
    console.log('Team ID:', teamId);

    // 팀 정보와 멤버 정보 가져오기
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: true
          }
        },
        tasks: true
      }
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // 팀원 정보 정리
    const memberInfo = team.members.map(member => ({
      name: member.user?.name || member.user?.email || 'Unknown',
      subjects: member.subjects || [],
      currentRole: member.role || 'member',
      strengths: member.strengths || [],
      weaknesses: member.weaknesses || [],
      interests: member.interests || [],
      personality: member.personality as { type: string; traits: string[] } | null
    }));

    // 작업 카테고리 분석
    const taskCategories = [...new Set(team.tasks.map(task => task.category))];
    const taskPhases = [...new Set(team.tasks.map(task => task.phase))];

    console.log('Team data:', {
      name: team.name,
      memberCount: team.members.length,
      hasProjectGoal: !!team.projectGoal
    });

    // AI에게 역할 추천 요청
    const prompt = `
Pure Ocean 프로젝트 팀의 역할 분담을 추천해주세요.

팀 정보:
- 팀 이름: ${team.name}
- 팀 슬로건: ${team.slogan || '없음'}
- 프로젝트 목표: ${team.projectGoal || team.description || '미정'}

팀원 정보:
${memberInfo.map((m, i) => `${i + 1}. ${m.name}
   - 융합 과목: ${m.subjects.join(', ')}
   - 현재 역할: ${m.currentRole === 'leader' ? '팀장' : '팀원'}
   - 강점: ${m.strengths.length > 0 ? m.strengths.join(', ') : '미입력'}
   - 개선할 점: ${m.weaknesses.length > 0 ? m.weaknesses.join(', ') : '미입력'}
   - 관심 분야: ${m.interests.length > 0 ? m.interests.join(', ') : '미입력'}
   - 성격 유형: ${m.personality?.type || '미분석'}`).join('\n')}

프로젝트 작업 유형:
- 작업 카테고리: ${taskCategories.join(', ')}
- 프로젝트 단계: ${taskPhases.join(', ')}

각 팀원에게 적합한 구체적인 역할과 담당 업무를 추천해주세요.
팀원들의 융합 과목, 강점, 관심 분야, 성격 유형을 종합적으로 고려하여 최적의 역할 분담을 제안해주세요.
특히 팀원들의 강점을 최대한 활용하고, 개선할 점은 서로 보완할 수 있는 방향으로 역할을 배치해주세요.

다음 형식으로 답변해주세요:
1. [팀원 이름]: [추천 역할]
   - 주요 담당 업무: [구체적인 업무 내용]
   - 추천 이유: [융합 과목과 연계한 이유]
   - 협업 포인트: [다른 팀원과의 협업 방안]
`;

    console.log('Calling OpenAI API...');
    console.log('OpenAI API key exists:', !!process.env.OPENAI_API_KEY);
    console.log('OpenAI API key format:', process.env.OPENAI_API_KEY?.startsWith('sk-') ? 'Valid' : 'Invalid');
    
    let response;
    try {
      response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "당신은 Pure Ocean 프로젝트의 팀 빌딩 전문가입니다. 고등학생들의 융합 과목, 개인적 강점, 관심사, 성격 유형을 종합적으로 분석하여 최적의 역할 분담을 제안해주세요. 각 팀원이 자신의 강점을 발휘하면서도 성장할 수 있는 역할을 추천해주세요."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });
      
      console.log('OpenAI API response received');
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      throw new Error(`OpenAI API error: ${openaiError instanceof Error ? openaiError.message : 'Unknown error'}`);
    }

    const recommendations = response.choices[0].message.content || '';

    // 추천 결과 저장 (선택사항) - 에러 발생 시 무시
    try {
      // 사용자 찾기
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      });
      
      if (user) {
        await prisma.analytics.create({
          data: {
            userId: user.id,
            eventType: 'role_recommendation',
            eventData: {
              teamId,
              recommendations: recommendations.slice(0, 500), // 길이 제한
              timestamp: new Date().toISOString()
            }
          }
        });
      }
    } catch (analyticsError) {
      console.error('Failed to save analytics:', analyticsError);
      // Analytics 저장 실패는 무시하고 계속 진행
    }

    return NextResponse.json({ 
      recommendations,
      teamName: team.name,
      memberCount: team.members.length
    });
  } catch (error) {
    console.error('Error in recommend-roles:', error);
    
    // 더 자세한 에러 정보 제공
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return handleApiError(error);
  }
}