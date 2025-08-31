import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { DocumentJobManager } from '@/lib/document-job';
import { handleApiError } from '@/lib/api-helpers';

export async function POST(
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

    // 실패한 작업만 재시도 가능
    if (job.status !== 'FAILED') {
      return NextResponse.json({ 
        error: 'Only failed jobs can be retried',
        currentStatus: job.status 
      }, { status: 400 });
    }

    // 작업 상태를 PENDING으로 재설정
    const resetJob = await DocumentJobManager.updateJobStatus(jobId, {
      status: 'PENDING',
      progress: 0,
      currentStep: '재시도 준비 중',
      error: undefined,
      completedAt: undefined,
      stepDetails: {
        documentAccess: 'pending',
        contentAnalysis: 'pending',
        feedbackGeneration: 'pending',
        documentUpdate: 'pending'
      }
    });

    // 백그라운드에서 재처리 시작
    DocumentJobManager.startBackgroundProcessing(jobId);

    return NextResponse.json({
      jobId: resetJob.id,
      status: resetJob.status,
      progress: resetJob.progress,
      message: '작업을 재시도합니다.'
    });

  } catch (error) {
    console.error('Job retry error:', error);
    return handleApiError(error);
  }
}