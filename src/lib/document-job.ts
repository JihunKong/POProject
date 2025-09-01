import { prisma } from '@/lib/prisma';
import { DocumentJobStatus, Prisma } from '@prisma/client';
import { 
  getGoogleDocsService, 
  extractDocumentId, 
  getDocumentContent,
  insertFeedbackAsComments,
  insertFeedbackToDoc,
  identifyDocumentSections,
  optimizeFeedbackPlacement,
  getDocumentRevision,
  getDocumentCommentsCount,
  detectDocumentChanges,
  GENRES
} from '@/lib/google-docs';
import { openai, DEFAULT_MODEL } from '@/lib/openai';

export interface DocumentJobDetails {
  documentAccess: 'pending' | 'completed' | 'failed';
  contentAnalysis: 'pending' | 'completed' | 'failed';
  feedbackGeneration: 'pending' | 'completed' | 'failed';
  documentUpdate: 'pending' | 'completed' | 'failed';
}

export interface DocumentJobData {
  id: string;
  userId: string;
  documentId: string;
  documentUrl: string;
  genre: string;
  status: DocumentJobStatus;
  progress: number;
  currentStep?: string | null;
  totalSteps: number;
  error?: string | null;
  startedAt: Date;
  completedAt?: Date | null;
  initialRevision?: string | null;
  finalRevision?: string | null;
  commentsAdded: number;
  stepDetails?: DocumentJobDetails | null;
  estimatedTime?: number | null;
}

export class DocumentJobManager {
  // 새 작업 생성
  static async createJob(
    userId: string,
    documentUrl: string,
    genre: string
  ): Promise<DocumentJobData> {
    const documentId = extractDocumentId(documentUrl);
    if (!documentId) {
      throw new Error('Invalid Google Docs URL');
    }

    const estimatedTime = DocumentJobManager.calculateEstimatedTime(genre);
    const initialStepDetails: DocumentJobDetails = {
      documentAccess: 'pending',
      contentAnalysis: 'pending',
      feedbackGeneration: 'pending',
      documentUpdate: 'pending'
    };

    const job = await prisma.documentFeedbackJob.create({
      data: {
        userId,
        documentId,
        documentUrl,
        genre,
        estimatedTime,
        stepDetails: initialStepDetails as unknown as Prisma.InputJsonValue,
        currentStep: '작업 준비 중'
      }
    });

    return job as DocumentJobData;
  }

  // 작업 상태 업데이트
  static async updateJobStatus(
    jobId: string,
    updates: {
      status?: DocumentJobStatus;
      progress?: number;
      currentStep?: string;
      error?: string;
      completedAt?: Date;
      stepDetails?: Partial<DocumentJobDetails>;
      commentsAdded?: number;
      initialRevision?: string;
      finalRevision?: string;
    }
  ): Promise<DocumentJobData> {
    const currentJob = await prisma.documentFeedbackJob.findUnique({
      where: { id: jobId }
    });

    if (!currentJob) {
      throw new Error('Job not found');
    }

    let newStepDetails = currentJob.stepDetails as DocumentJobDetails | null;
    if (updates.stepDetails && newStepDetails) {
      newStepDetails = { ...newStepDetails, ...updates.stepDetails };
    }

    const job = await prisma.documentFeedbackJob.update({
      where: { id: jobId },
      data: {
        ...updates,
        stepDetails: newStepDetails as unknown as Prisma.InputJsonValue
      }
    });

    return job as DocumentJobData;
  }

  // 작업 조회
  static async getJob(jobId: string): Promise<DocumentJobData | null> {
    const job = await prisma.documentFeedbackJob.findUnique({
      where: { id: jobId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return job as DocumentJobData | null;
  }

  // 예상 시간 계산
  static calculateEstimatedTime(genre: string): number {
    const baseTimes: Record<string, number> = {
      '워크시트': 15, // 15분
      '보고서': 12,   // 12분
      '발표자료': 10, // 10분
      '소논문': 20,   // 20분
      '논설문': 8,    // 8분
    };
    
    return baseTimes[genre] || 15;
  }

  // 남은 시간 계산
  static calculateRemainingTime(job: DocumentJobData): number {
    if (!job.estimatedTime) return 0;
    
    const elapsedMinutes = Math.floor(
      (Date.now() - job.startedAt.getTime()) / 60000
    );
    
    const progressBasedRemaining = Math.floor(
      (job.estimatedTime * (100 - job.progress)) / 100
    );
    
    return Math.max(0, Math.min(progressBasedRemaining, job.estimatedTime - elapsedMinutes));
  }

  // 백그라운드 문서 처리 실행
  static async processDocument(jobId: string): Promise<void> {
    const job = await DocumentJobManager.getJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    try {
      console.log(`📝 Starting background processing for job ${jobId}`);
      
      // Step 1: 문서 접근 확인 및 초기 상태 기록
      await DocumentJobManager.updateJobStatus(jobId, {
        status: 'PROCESSING',
        progress: 10,
        currentStep: '문서 접근 권한 확인 중',
        stepDetails: { documentAccess: 'pending' }
      });

      const docsService = getGoogleDocsService();
      
      // 초기 문서 상태 기록
      const initialRevision = await getDocumentRevision(job.documentId);
      const initialCommentsCount = await getDocumentCommentsCount(job.documentId);
      
      const { title, contentWithPositions } = await getDocumentContent(
        docsService, 
        job.documentId
      );

      await DocumentJobManager.updateJobStatus(jobId, {
        progress: 25,
        currentStep: '문서 내용 분석 중',
        initialRevision,
        stepDetails: { 
          documentAccess: 'completed',
          contentAnalysis: 'pending' 
        }
      });

      // 빈 문서 검사
      const fullText = contentWithPositions.map(item => item.text).join('\n');
      const meaningfulContent = fullText.replace(/[\s\n\r_]+/g, ' ').trim();
      const isEmptyOrTemplate = meaningfulContent.length < 100 || 
        meaningfulContent.includes('_______________________________');

      // Step 2: 문서 섹션 분석
      const documentSections = identifyDocumentSections(contentWithPositions);
      
      await DocumentJobManager.updateJobStatus(jobId, {
        progress: 50,
        currentStep: 'AI 피드백 생성 중',
        stepDetails: { 
          contentAnalysis: 'completed',
          feedbackGeneration: 'pending' 
        }
      });

      // Step 3: AI 피드백 생성
      const feedbacks = await DocumentJobManager.generateFeedbacks(
        job.genre, 
        fullText, 
        documentSections, 
        isEmptyOrTemplate,
        contentWithPositions
      );

      await DocumentJobManager.updateJobStatus(jobId, {
        progress: 75,
        currentStep: '문서에 피드백 추가 중',
        stepDetails: { 
          feedbackGeneration: 'completed',
          documentUpdate: 'pending' 
        }
      });

      // Step 4: 문서에 피드백 삽입 (먼저 코멘트로 시도, 실패 시 인라인 텍스트로)
      const optimizedFeedbacks = optimizeFeedbackPlacement(documentSections, feedbacks);
      const success = await insertFeedbackAsComments(docsService, job.documentId, optimizedFeedbacks);

      if (!success) {
        throw new Error('Failed to insert feedback into document');
      }

      // Step 4.5: 문서 변경 감지 (최대 5분 대기)
      await DocumentJobManager.updateJobStatus(jobId, {
        progress: 90,
        currentStep: '문서 변경 확인 중',
        stepDetails: { 
          documentUpdate: 'completed'
        }
      });

      console.log(`🔍 Detecting document changes for job ${jobId}`);
      const changeResult = await detectDocumentChanges(
        job.documentId,
        initialRevision,
        initialCommentsCount,
        300000 // 5분 최대 대기
      );

      console.log(`📊 Change detection result:`, changeResult);

      // 완료 처리
      await DocumentJobManager.updateJobStatus(jobId, {
        status: 'COMPLETED',
        progress: 100,
        currentStep: '완료',
        completedAt: new Date(),
        commentsAdded: changeResult.finalCommentsCount - initialCommentsCount,
        finalRevision: changeResult.finalRevision,
        stepDetails: { 
          documentUpdate: 'completed'
        }
      });

      console.log(`✅ Background processing completed for job ${jobId}`);

    } catch (error) {
      console.error(`❌ Background processing failed for job ${jobId}:`, error);
      
      await DocumentJobManager.updateJobStatus(jobId, {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
        currentStep: '처리 실패'
      });
      
      throw error;
    }
  }

  // AI 피드백 생성 (기존 로직 분리)
  static async generateFeedbacks(
    genre: string,
    fullText: string,
    documentSections: ReturnType<typeof identifyDocumentSections>,
    isEmptyOrTemplate: boolean,
    contentWithPositions: Array<{
      text: string;
      start: number;
      end: number;
    }>
  ): Promise<Array<{
    type: string;
    content: string;
    insert_at: number;
  }>> {
    const feedbacks: Array<{
      type: string;
      content: string;
      insert_at: number;
    }> = [];

    const genreInfo = GENRES[genre as keyof typeof GENRES];

    // 전체 문서 평가
    let overallPrompt;
    if (isEmptyOrTemplate) {
      overallPrompt = `
다음은 ${genre} 템플릿입니다. 현재 대부분의 내용이 작성되지 않았습니다.

문서 내용:
${fullText.slice(0, 3000)}...

아직 내용이 작성되지 않았습니다. 가장 먼저 작성해야 할 부분을 1-2줄로 안내해주세요.`;
    } else {
      overallPrompt = `
다음은 ${genre}입니다. ${genre}의 일반적인 구조적 원리에 따라 평가해주세요.

평가 기준:
구조: ${genreInfo.structure.join(', ')}
초점: ${genreInfo.criteria}

문서 전체 내용:
${fullText.slice(0, 3000)}...

위 ${genre}에 대해 가장 중요한 개선점 한 가지를 1-2줄로 간단명료하게 제시해주세요.`;
    }

    const systemPrompt = `당신은 완도고등학교 프로젝트의 전문 멘토입니다. 
          
역할:
- 2학년 학생들의 다양한 주제 프로젝트 워크시트 검토
- 7단계 프로젝트 과정에 따른 체계적 피드백 제공
- SDGs(지속가능발전목표) 전체를 아우르는 융합적 사고 유도

피드백 원칙:
1. 매우 간결하게 1-2줄로 핵심만 전달
2. 가장 중요한 개선점 한 가지만 제시
3. 구체적이고 실행 가능한 제안 중심

평가 중점:
- 가장 시급한 개선사항 한 가지
- 즉시 실행 가능한 조언

중요한 형식 규칙:
- 마크다운 문법을 사용하지 마세요 (**, *, #, \` 등 사용 금지)
- 일반 텍스트로만 작성하세요
- 강조가 필요한 부분은 "강조: 내용" 형태로 작성하세요
- 목록은 "- 항목1", "- 항목2" 형태로 작성하세요
- 제목은 "■ 제목:" 형태로 작성하세요`;

    const overallResponse = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: overallPrompt }
      ],
      max_tokens: 150,
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

    // 핵심 개선점 2-3개만 생성 (섹션별 피드백 루프 제거)
    const keyPointsPrompt = `
문서를 전체적으로 분석한 결과, 가장 중요한 개선점 2가지를 제시해주세요.
각 개선점은 1-2줄로 간결하게 작성하고, 가장 시급한 순서대로 제시해주세요.

문서 내용:
${fullText.slice(0, 2000)}

다음 형식으로 작성해주세요:
■ 개선점 1: (구체적인 내용)
■ 개선점 2: (구체적인 내용)`;

    const keyPointsResponse = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: keyPointsPrompt }
      ],
      max_tokens: 100,
      temperature: 0.7
    });

    const keyPointsFeedback = keyPointsResponse.choices[0].message.content || '';
    
    // 핵심 개선점을 문서 중간 위치에 추가
    if (contentWithPositions.length > 1) {
      const midPoint = Math.floor(contentWithPositions.length / 2);
      feedbacks.push({
        type: '핵심 개선점',
        content: keyPointsFeedback,
        insert_at: contentWithPositions[midPoint].start
      });
    }

    return feedbacks;
  }

  // 백그라운드 처리 시작 (Promise를 반환하지 않고 백그라운드에서 실행)
  static startBackgroundProcessing(jobId: string): void {
    // 타임아웃 설정 (15분)
    const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Document processing timed out after ${TIMEOUT_MS / 1000}s`));
      }, TIMEOUT_MS);
    });

    // 즉시 백그라운드에서 처리 시작 (타임아웃과 race)
    Promise.race([
      DocumentJobManager.processDocument(jobId),
      timeoutPromise
    ]).catch(async (error) => {
      console.error(`💥 Background processing error for job ${jobId}:`, error);
      
      try {
        // 🔧 중요: 실패 상태를 데이터베이스에 기록
        await DocumentJobManager.updateJobStatus(jobId, {
          status: 'FAILED',
          error: error instanceof Error ? error.message : String(error),
          currentStep: error.message?.includes('timed out') ? '처리 시간 초과' : '처리 중 오류 발생',
          completedAt: new Date()
        });
        console.log(`❌ Job ${jobId} marked as FAILED in database`);
      } catch (dbError) {
        console.error(`💥 Failed to update job status for ${jobId}:`, dbError);
      }
    });
  }
}