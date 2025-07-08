import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { openai } from '@/lib/openai';
import { 
  getGoogleDocsService, 
  extractDocumentId, 
  getDocumentContent,
  insertFeedbackToDoc,
  GENRES
} from '@/lib/google-docs';
import { handleApiError } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { genre, docUrl } = await req.json();
    if (!genre || !docUrl) {
      return NextResponse.json({ error: 'Genre and document URL are required' }, { status: 400 });
    }

    // 문서 ID 추출
    const documentId = extractDocumentId(docUrl);
    if (!documentId) {
      return NextResponse.json({ error: 'Invalid Google Docs URL' }, { status: 400 });
    }

    // Google Docs 서비스 초기화
    const docsService = getGoogleDocsService();
    
    // 문서 내용 가져오기
    const { title, contentWithPositions } = await getDocumentContent(docsService, documentId);
    
    if (!contentWithPositions || contentWithPositions.length === 0) {
      return NextResponse.json({ error: 'Document is empty' }, { status: 400 });
    }

    // 전체 텍스트 추출
    const fullText = contentWithPositions.map(item => item.text).join('\n');
    
    // 피드백을 저장할 배열
    const feedbacks: Array<{
      type: string;
      content: string;
      insert_at: number;
    }> = [];

    // 먼저 전체 문서에 대한 종합 평가 생성
    const genreInfo = GENRES[genre as keyof typeof GENRES];
    const overallPrompt = `
다음은 ${genre}입니다. ${genre}의 일반적인 구조적 원리에 따라 평가해주세요.

평가 기준:
구조: ${genreInfo.structure.join(', ')}
초점: ${genreInfo.criteria}

문서 전체 내용:
${fullText.slice(0, 3000)}...

위 ${genre}에 대해 다음 사항을 포함하여 종합적으로 평가해주세요:
1. 장르에 맞는 구조를 갖추었는지
2. 각 부분이 적절히 구성되었는지
3. 개선이 필요한 부분
4. 잘된 점

평가는 구체적이고 건설적으로 작성해주세요.`;

    const overallResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `당신은 완도고등학교 Pure Ocean Project의 전문 멘토입니다. 
          
역할:
- 2학년 학생들의 해양 환경 보호 프로젝트 워크시트 검토
- 7단계 프로젝트 과정에 따른 체계적 피드백 제공
- SDGs 14번(해양 생태계 보호)을 중심으로 한 융합적 사고 유도

피드백 원칙:
1. 학생 수준에 맞는 구체적이고 실행 가능한 제안
2. 긍정적인 부분을 먼저 언급한 후 개선점 제시
3. 각 단계별 핵심 요소가 충족되었는지 확인
4. 교과 융합적 사고와 창의성 격려
5. 팀워크와 협업 역량 강화 방향 제시

평가 중점:
- 해양 환경 문제에 대한 이해도
- SDGs 연계의 논리성
- 해결책의 창의성과 실현가능성  
- 5일간 실행 계획의 구체성
- 교과 융합의 적절성
- 성찰의 깊이와 진정성`
        },
        {
          role: "user",
          content: overallPrompt
        }
      ],
      max_tokens: 3000,
      temperature: 0.7
    });

    const overallFeedback = overallResponse.choices[0].message.content || '';
    
    // 전체 평가를 문서 시작 부분에 추가
    if (contentWithPositions.length > 0) {
      feedbacks.push({
        type: '전체 평가',
        content: overallFeedback,
        insert_at: contentWithPositions[0].start
      });
    }

    // 섹션별로 분석 및 피드백 생성
    for (let idx = 0; idx < contentWithPositions.length; idx++) {
      const section = contentWithPositions[idx];
      
      if (section.text.trim().length > 50) { // 의미있는 길이의 텍스트만 분석
        const sectionPrompt = `
이것은 ${genre}의 일부분입니다.
현재 분석 중인 부분이 ${genre}의 어느 구조에 해당하는지 파악하고,
해당 부분에 맞는 구체적인 피드백을 제공해주세요.

${genre}의 구조: ${genreInfo.structure.join(', ')}

분석할 내용:
${section.text}

위 내용에 대해 2-3문장으로 구체적이고 건설적인 피드백을 작성해주세요.
개선 제안을 포함해주세요.`;

        const sectionResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `당신은 완도고등학교 Pure Ocean Project 멘토입니다. 
              
워크시트의 각 섹션을 7단계 구조에 맞게 검토하고, 학생들이 다음 단계로 발전할 수 있도록 건설적인 피드백을 제공해주세요.

피드백 형식:
1. 잘된 점 1-2가지 구체적으로 언급
2. 개선할 점 1-2가지와 구체적 방법 제시  
3. 다음 단계 연결을 위한 조언`
            },
            {
              role: "user",
              content: sectionPrompt
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        });

        const sectionFeedback = sectionResponse.choices[0].message.content || '';
        
        // 피드백을 해당 섹션 끝에 추가
        feedbacks.push({
          type: `섹션 ${idx + 1} 평가`,
          content: sectionFeedback,
          insert_at: section.end
        });
      }
    }

    // 피드백을 문서에 삽입
    const success = await insertFeedbackToDoc(docsService, documentId, feedbacks);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to insert feedback' }, { status: 500 });
    }

    // 성공 응답
    const responseMessage = `✅ ${title} 문서에 ${feedbacks.length}개의 평가가 추가되었습니다.\n\n문서를 확인해보세요: https://docs.google.com/document/d/${documentId}/edit`;
    
    return NextResponse.json({
      conversationId: null,
      message: responseMessage,
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 403) {
      return NextResponse.json({ 
        error: '문서를 편집할 권한이 없습니다. 문서에 편집자 권한을 부여해주세요.' 
      }, { status: 403 });
    }
    return handleApiError(error);
  }
}