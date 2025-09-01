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

  // AI 피드백 생성 - 섹션별 맥락적 피드백 시스템
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
    let feedbacks: Array<{
      type: string;
      content: string;
      insert_at: number;
    }> = [];

    const genreInfo = GENRES[genre as keyof typeof GENRES];

    // 시스템 프롬프트 - 교육적 가치 강화
    const systemPrompt = `당신은 완도고등학교 프로젝트의 전문 멘토입니다. 
          
역할:
- 2학년 학생들의 다양한 주제 프로젝트 워크시트 검토
- 7단계 프로젝트 과정에 따른 체계적 피드백 제공
- SDGs(지속가능발전목표) 전체를 아우르는 융합적 사고 유도

피드백 원칙:
1. 매우 간결하게 1-2줄로 핵심만 전달
2. 구체적이고 실행 가능한 제안 중심
3. 격려와 개선점을 균형있게 제시
4. 학생의 현재 문서 내용을 구체적으로 언급

중요한 형식 규칙:
- 마크다운 문법을 사용하지 마세요 (**, *, #, \` 등 사용 금지)
- 일반 텍스트로만 작성하세요
- 강조가 필요한 부분은 "강조: 내용" 형태로 작성하세요`;

    // 빈 문서인 경우 기본 가이드만 제공
    if (isEmptyOrTemplate) {
      const emptyDocPrompt = `
학생이 ${genre} 작성을 시작하려고 합니다. 
가장 먼저 작성해야 할 3가지 핵심 요소를 안내해주세요.
각 요소는 1줄로 간단명료하게 설명하세요.`;

      const response = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: emptyDocPrompt }
        ],
        max_tokens: 150,
        temperature: 0.7
      });

      feedbacks.push({
        type: '시작 가이드',
        content: response.choices[0].message.content || '문서 작성을 시작해보세요!',
        insert_at: contentWithPositions[0]?.start || 1
      });
      
      return feedbacks;
    }

    // 1. 서론/도입부 피드백 (2-3개)
    const introSections = documentSections.filter(s => 
      s.title.includes('서론') || s.title.includes('도입') || 
      s.title.includes('Step 1') || s.title.includes('문제 발견') ||
      s.type === 'header' && documentSections.indexOf(s) < 2
    );

    if (introSections.length > 0 || contentWithPositions.length > 0) {
      const introText = introSections.length > 0 
        ? introSections.map(s => s.text).join('\n')
        : contentWithPositions[0].text;
      
      const introPrompt = `
다음은 ${genre}의 도입부입니다:
${introText.slice(0, 500)}

이 도입부에 대해 2가지 피드백을 제공하세요:
1. 잘된 점 1가지 (격려)
2. 개선할 점 1가지 (구체적 제안)

각 피드백은 1-2줄로 작성하세요.`;

      const introResponse = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: introPrompt }
        ],
        max_tokens: 100,
        temperature: 0.7
      });

      const introFeedback = introResponse.choices[0].message.content || '';
      const introLines = introFeedback.split('\n').filter(line => line.trim());
      
      // 격려 피드백
      if (introLines[0]) {
        feedbacks.push({
          type: '💙 도입부 - 잘된 점',
          content: introLines[0].replace(/^[0-9\.\-\s]+/, ''),
          insert_at: contentWithPositions[0].start
        });
      }
      
      // 개선 피드백
      if (introLines[1] && contentWithPositions.length > 0) {
        feedbacks.push({
          type: '🟡 도입부 - 개선 제안',
          content: introLines[1].replace(/^[0-9\.\-\s]+/, ''),
          insert_at: contentWithPositions[0].end - 1
        });
      }
    }

    // 2. 본론 섹션별 피드백 (4-6개)
    const bodySections = documentSections.filter(s => 
      s.type === 'content' || 
      (s.title.includes('Step') && !s.title.includes('Step 1')) ||
      s.title.includes('분석') || s.title.includes('개발') || 
      s.title.includes('실행') || s.title.includes('방법')
    );

    // 본론이 없으면 중간 contentWithPositions 사용
    const sectionsToAnalyze = bodySections.length > 0 
      ? bodySections 
      : contentWithPositions.slice(1, -1).map((c, i) => ({
          title: `섹션 ${i + 2}`,
          text: c.text,
          start: c.start,
          end: c.end,
          type: 'content' as const
        }));

    // 최대 3개 섹션만 분석 (과도한 피드백 방지)
    const selectedSections = sectionsToAnalyze.slice(0, 3);
    
    for (let i = 0; i < selectedSections.length; i++) {
      const section = selectedSections[i];
      const sectionText = section.text.slice(0, 400);
      
      // 빈 섹션 건너뛰기
      if (sectionText.trim().length < 50) continue;
      
      const sectionPrompt = `
다음은 ${genre}의 "${section.title}" 부분입니다:
${sectionText}

이 섹션에 대해 1-2가지 구체적인 피드백을 제공하세요:
- 논리성, 근거 제시, 구체성 등을 평가
- 개선 방법을 구체적으로 제시
- 각 피드백은 1줄로 작성`;

      const sectionResponse = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: sectionPrompt }
        ],
        max_tokens: 80,
        temperature: 0.7
      });

      const sectionFeedback = sectionResponse.choices[0].message.content || '';
      
      // 섹션 시작 부분에 피드백 추가
      feedbacks.push({
        type: `📝 ${section.title}`,
        content: sectionFeedback.trim(),
        insert_at: section.start
      });
    }

    // 3. 전환 및 연결성 피드백 (2-3개)
    if (contentWithPositions.length > 3) {
      // 섹션 간 전환 부분 찾기
      const transitionPoints = [];
      
      for (let i = 1; i < Math.min(contentWithPositions.length - 1, 4); i++) {
        const prevSection = contentWithPositions[i - 1];
        const currentSection = contentWithPositions[i];
        
        // 주요 전환 지점 식별
        if (prevSection.text.length > 100 && currentSection.text.length > 100) {
          transitionPoints.push({
            index: i,
            position: currentSection.start,
            prevText: prevSection.text.slice(-100),
            currentText: currentSection.text.slice(0, 100)
          });
        }
      }
      
      // 1-2개 전환점만 선택
      const selectedTransitions = transitionPoints.slice(0, 2);
      
      for (const transition of selectedTransitions) {
        const transitionPrompt = `
이전 단락 끝: ${transition.prevText}
다음 단락 시작: ${transition.currentText}

두 단락 간의 연결성을 평가하고, 자연스러운 전환을 위한 제안을 1줄로 작성하세요.`;

        const transitionResponse = await openai.chat.completions.create({
          model: DEFAULT_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: transitionPrompt }
          ],
          max_tokens: 50,
          temperature: 0.7
        });

        feedbacks.push({
          type: '🔗 연결성',
          content: transitionResponse.choices[0].message.content || '',
          insert_at: transition.position
        });
      }
    }

    // 4. 결론부 피드백 (2개)
    const conclusionSections = documentSections.filter(s => 
      s.title.includes('결론') || s.title.includes('성찰') || 
      s.title.includes('기대 효과') || s.title.includes('마무리')
    );

    const lastSection = contentWithPositions[contentWithPositions.length - 1];
    if (conclusionSections.length > 0 || lastSection) {
      const conclusionText = conclusionSections.length > 0
        ? conclusionSections.map(s => s.text).join('\n')
        : lastSection.text;
      
      const conclusionPrompt = `
다음은 ${genre}의 결론부입니다:
${conclusionText.slice(0, 400)}

결론부에 대해 2가지 피드백을 제공하세요:
1. 요약과 종합의 효과성
2. 시사점이나 향후 과제 제시 여부

각 피드백은 1줄로 작성하세요.`;

      const conclusionResponse = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: conclusionPrompt }
        ],
        max_tokens: 80,
        temperature: 0.7
      });

      const conclusionFeedback = conclusionResponse.choices[0].message.content || '';
      const conclusionLines = conclusionFeedback.split('\n').filter(line => line.trim());
      
      if (conclusionLines[0] && lastSection) {
        feedbacks.push({
          type: '✨ 결론 - 종합 평가',
          content: conclusionLines[0].replace(/^[0-9\.\-\s]+/, ''),
          insert_at: lastSection.start
        });
      }
      
      if (conclusionLines[1] && lastSection) {
        feedbacks.push({
          type: '🎯 결론 - 발전 방향',
          content: conclusionLines[1].replace(/^[0-9\.\-\s]+/, ''),
          insert_at: lastSection.end - 1
        });
      }
    }

    // 5. 전체 총평 (1개)
    const overallPrompt = `
${genre} 전체를 검토한 결과, 가장 중요한 핵심 메시지를 1-2줄로 전달하세요.
학생에게 격려가 되면서도 발전 방향을 제시하는 내용으로 작성하세요.`;

    const overallResponse = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: overallPrompt }
      ],
      max_tokens: 60,
      temperature: 0.7
    });

    // 전체 총평은 문서 시작 부분에 추가
    feedbacks.unshift({
      type: '🌟 전체 총평',
      content: overallResponse.choices[0].message.content || '좋은 시작입니다! 계속 발전시켜보세요.',
      insert_at: contentWithPositions[0]?.start || 1
    });

    // 피드백 수 조정 (8-12개 유지)
    if (feedbacks.length < 8 && contentWithPositions.length > feedbacks.length) {
      // 추가 피드백이 필요한 경우
      const additionalPrompt = `
문서에서 추가로 언급할 만한 개선점 ${8 - feedbacks.length}가지를 각각 1줄로 제시하세요.
구체적이고 실행 가능한 제안 위주로 작성하세요.`;

      const additionalResponse = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: additionalPrompt }
        ],
        max_tokens: 100,
        temperature: 0.7
      });

      const additionalLines = additionalResponse.choices[0].message.content?.split('\n').filter(l => l.trim()) || [];
      additionalLines.forEach((line, idx) => {
        if (feedbacks.length < 12 && contentWithPositions[idx + 2]) {
          feedbacks.push({
            type: '💡 추가 제안',
            content: line.replace(/^[0-9\.\-\s]+/, ''),
            insert_at: contentWithPositions[idx + 2].start
          });
        }
      });
    }

    // 피드백이 너무 많으면 우선순위에 따라 조정
    if (feedbacks.length > 12) {
      // 추가 제안 유형부터 제거
      feedbacks = feedbacks.filter(f => !f.type.includes('추가 제안')).slice(0, 12);
    }

    console.log(`📊 Generated ${feedbacks.length} contextual feedbacks for document`);
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