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
import { DocumentAnalyzer } from './document-analyzer';
import { FeedbackGenerator } from './feedback-generator';

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

      // Step 2: 문서 섹션 분석 (목차 감지 및 제외)
      const documentSections = identifyDocumentSections(contentWithPositions);
      
      // 목차 감지 로깅
      const tocSections = contentWithPositions.filter((item, idx) => {
        const text = item.text;
        const isTOC = text.includes('목차') || text.includes('차례') || 
                     text.includes('Table of Contents') || text.includes('Contents');
        if (isTOC) {
          console.log(`📑 목차 감지됨 (섹션 ${idx}): ${text.slice(0, 50)}...`);
        }
        return isTOC;
      });
      
      if (tocSections.length > 0) {
        console.log(`⚠️ 목차 ${tocSections.length}개 섹션 발견, 본문만 분석합니다.`);
      }
      
      await DocumentJobManager.updateJobStatus(jobId, {
        progress: 50,
        currentStep: 'AI 피드백 생성 중',
        stepDetails: { 
          contentAnalysis: 'completed',
          feedbackGeneration: 'pending' 
        }
      });

      // Step 3: AI 피드백 생성 (목차 제외한 본문만 대상)
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

  // AI 피드백 생성 - 전체 문서 분석 후 전략적 피드백 생성
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
    console.log('🔍 Starting intelligent document analysis...');
    
    // 빈 문서 체크
    if (isEmptyOrTemplate) {
      // 빈 문서에 대한 기본 가이드 제공
      const systemPrompt = `당신은 완도고등학교 프로젝트의 전문 멘토입니다.
학생에게 ${genre} 작성을 시작하는 방법을 안내하세요.`;
      
      const emptyDocPrompt = `학생이 ${genre} 작성을 시작하려고 합니다. 
가장 먼저 작성해야 할 3가지 핵심 요소를 안내해주세요.
각 요소는 1줄로 간단명료하게 설명하세요.`;

      const response = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: emptyDocPrompt }
        ],
        max_tokens: 200,
        temperature: 0.7
      });

      return [{
        type: '🚀 시작 가이드',
        content: response.choices[0].message.content || '문서 작성을 시작해보세요!',
        insert_at: contentWithPositions[0]?.start || 1
      }];
    }
    
    // 1. 전체 문서 분석 수행
    const analyzer = new DocumentAnalyzer(genre, contentWithPositions);
    const analysis = await analyzer.analyzeFullDocument();
    
    console.log(`📊 Document Analysis Complete:`);
    console.log(`  - Quality Score: ${analysis.qualityScore}/10`);
    console.log(`  - Student Level: ${analysis.studentLevel}`);
    console.log(`  - Key Issues: ${analysis.keyIssues.length}`);
    console.log(`  - Recommended Feedback Count: ${analysis.recommendedFeedbackCount}`);
    
    // 2. 분석 결과를 바탕으로 전략적 피드백 생성
    const generator = new FeedbackGenerator(genre, analysis);
    const strategicFeedbacks = await generator.generateStrategicFeedback();
    
    // 3. 피드백 포맷 변환 (GeneratedFeedback → 기존 포맷)
    const feedbacks = strategicFeedbacks.map(feedback => ({
      type: feedback.type,
      content: feedback.content,
      insert_at: feedback.insert_at
    }));
    
    console.log(`✅ Generated ${feedbacks.length} strategic feedbacks based on full document analysis`);
    
    return feedbacks;
  }

  // 백그라운드 처리 시작 (Promise를 반환하지 않고 백그라운드에서 실행)
  static startBackgroundProcessing(jobId: string): void {
    // 타임아웃 설정 (15분)
    const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
    
    console.log(`⏰ 백그라운드 작업 시작: ${jobId}, 타임아웃: ${TIMEOUT_MS / 1000}초`);
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        console.log(`⏱️ 타임아웃 발생! Job ${jobId}가 ${TIMEOUT_MS / 1000}초를 초과했습니다.`);
        reject(new Error(`Document processing timed out after ${TIMEOUT_MS / 1000}s`));
      }, TIMEOUT_MS);
      
      // 타임아웃 ID 로깅
      console.log(`⏲️ 타임아웃 타이머 설정됨: ${timeoutId}`);
    });

    // 즉시 백그라운드에서 처리 시작 (타임아웃과 race)
    Promise.race([
      DocumentJobManager.processDocument(jobId).then(() => {
        console.log(`✅ Job ${jobId} 정상 완료됨 (타임아웃 전)`);
      }),
      timeoutPromise
    ]).catch(async (error) => {
      console.error(`💥 Background processing error for job ${jobId}:`, error);
      
      try {
        // 작업 상태 확인
        const currentJob = await DocumentJobManager.getJob(jobId);
        if (currentJob?.status === 'COMPLETED') {
          console.log(`ℹ️ Job ${jobId}는 이미 완료됨, 에러 무시`);
          return;
        }
        
        // 🔧 중요: 실패 상태를 데이터베이스에 기록
        await DocumentJobManager.updateJobStatus(jobId, {
          status: 'FAILED',
          error: error instanceof Error ? error.message : String(error),
          currentStep: error.message?.includes('timed out') ? '처리 시간 초과 (15분)' : '처리 중 오류 발생',
          completedAt: new Date()
        });
        console.log(`❌ Job ${jobId} marked as FAILED in database`);
      } catch (dbError) {
        console.error(`💥 Failed to update job status for ${jobId}:`, dbError);
      }
    });
  }
}
