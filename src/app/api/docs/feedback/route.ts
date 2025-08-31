import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { DocumentJobManager } from '@/lib/document-job';
import { extractDocumentId } from '@/lib/google-docs';
import { handleApiError } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

// API route configuration - 즉시 응답하므로 타임아웃 필요 없음
export const maxDuration = 10; // 10초 (작업 생성만 처리)

export async function POST(req: NextRequest) {
  console.log('🔧 [DEBUG] POST /api/docs/feedback - Starting request');
  try {
    console.log('🔧 [DEBUG] Getting session...');
    const session = await auth();
    console.log('🔧 [DEBUG] Session result:', JSON.stringify(session, null, 2));
    
    if (!session?.user?.email) {
      console.log('❌ [DEBUG] No session or email found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('✅ [DEBUG] Session valid, email:', session.user.email);

    console.log('🔧 [DEBUG] Parsing request body...');
    const { genre, docUrl } = await req.json();
    console.log('🔧 [DEBUG] Request data:', { genre, docUrl });
    
    if (!genre || !docUrl) {
      console.log('❌ [DEBUG] Missing genre or docUrl');
      return NextResponse.json({ error: 'Genre and document URL are required' }, { status: 400 });
    }

    // 문서 ID 추출 (기본 검증)
    console.log('🔧 [DEBUG] Extracting document ID...');
    const documentId = extractDocumentId(docUrl);
    console.log('🔧 [DEBUG] Document ID:', documentId);
    if (!documentId) {
      console.log('❌ [DEBUG] Invalid document URL');
      return NextResponse.json({ error: 'Invalid Google Docs URL' }, { status: 400 });
    }

    // 사용자 ID 확보 (JWT 토큰에 없으면 이메일로 조회)
    console.log('🔧 [DEBUG] Getting user ID...');
    let userId = session.user.id;
    console.log('🔧 [DEBUG] session.user.id:', userId);
    
    if (!userId) {
      console.log('🔧 [DEBUG] No userId in session, looking up by email...');
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });
      console.log('🔧 [DEBUG] Database lookup result:', user);
      if (!user) {
        console.log('❌ [DEBUG] User not found in database');
        return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
      }
      userId = user.id;
    }
    console.log('✅ [DEBUG] Final userId:', userId);

    // 작업 생성
    console.log('🔧 [DEBUG] Creating job with DocumentJobManager...');
    const job = await DocumentJobManager.createJob(
      userId,
      docUrl,
      genre
    );
    console.log('✅ [DEBUG] Job created successfully:', { jobId: job.id, status: job.status });

    // 백그라운드에서 문서 처리 시작 (await 하지 않음)
    console.log('🔧 [DEBUG] Starting background processing...');
    DocumentJobManager.startBackgroundProcessing(job.id);

    // 즉시 jobId 반환
    console.log('✅ [DEBUG] Returning successful response');
    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      estimatedTime: job.estimatedTime,
      message: '문서 첨삭 작업이 시작되었습니다. 진행 상황을 확인해주세요.'
    });

  } catch (error) {
    console.error('💥 [DEBUG] Document job creation error:', error);
    console.error('💥 [DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    if (error instanceof Error && 'code' in error && error.code === 403) {
      return NextResponse.json({ 
        error: '문서를 편집할 권한이 없습니다. 문서에 편집자 권한을 부여해주세요.' 
      }, { status: 403 });
    }
    
    return handleApiError(error);
  }
}