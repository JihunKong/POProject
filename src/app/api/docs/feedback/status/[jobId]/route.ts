import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { DocumentJobManager } from '@/lib/document-job';
import { handleApiError } from '@/lib/api-helpers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await params;
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    // 작업 정보 조회
    const job = await DocumentJobManager.getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 작업 소유자 확인
    if (job.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized access to job' }, { status: 403 });
    }

    // 예상 남은 시간 계산
    const estimatedTimeRemaining = DocumentJobManager.calculateRemainingTime(job);

    // 성공 메시지 생성 (완료된 경우)
    let successMessage = null;
    if (job.status === 'COMPLETED') {
      const docLink = `https://docs.google.com/document/d/${job.documentId}/edit`;
      successMessage = `✅ 첨삭이 완료되었습니다!\n\n📝 [Google Docs에서 피드백 확인하기](${docLink})\n\n💡 **다음 단계**: \n- 각 섹션에 직접 삽입된 파란색 배경의 AI 평가를 확인하세요\n- 피드백과 원본 내용을 함께 보면서 수정 및 보완하세요\n- 팀원들과 협업하여 각 단계를 체계적으로 완성해보세요`;
    }

    // 응답 데이터 구성
    const responseData = {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      currentStep: job.currentStep,
      totalSteps: job.totalSteps,
      estimatedTimeRemaining,
      estimatedTotalTime: job.estimatedTime,
      error: job.error,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      commentsAdded: job.commentsAdded,
      stepDetails: job.stepDetails,
      documentUrl: job.documentUrl,
      genre: job.genre,
      successMessage
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Job status check error:', error);
    return handleApiError(error);
  }
}