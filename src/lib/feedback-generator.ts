import { openai, DEFAULT_MODEL } from './openai';
import { DocumentAnalysis, DocumentSection } from './document-analyzer';
import { GENRES } from './google-docs';

// 피드백 타입 정의
export interface GeneratedFeedback {
  type: string;
  content: string;
  insert_at: number;
  priority: 'critical' | 'important' | 'enhancement';
  category: string;
}

// 피드백 생성 전략
export type FeedbackStrategy = 'foundational' | 'improvement' | 'refinement';

export class FeedbackGenerator {
  private genre: string;
  private analysis: DocumentAnalysis;

  constructor(genre: string, analysis: DocumentAnalysis) {
    this.genre = genre;
    this.analysis = analysis;
  }

  // 메인 피드백 생성 메서드
  async generateStrategicFeedback(): Promise<GeneratedFeedback[]> {
    // 1. 피드백 전략 결정
    const strategy = this.determineStrategy();
    
    // 2. 우선순위별 피드백 생성
    const feedbacks: GeneratedFeedback[] = [];
    
    // 3. 전체 총평 생성 (항상 포함)
    const overview = await this.generateOverviewFeedback();
    feedbacks.push(overview);
    
    // 4. 핵심 이슈 기반 피드백 생성
    const issueFeedbacks = await this.generateIssueBasedFeedbacks();
    feedbacks.push(...issueFeedbacks);
    
    // 5. 섹션별 전략적 피드백 생성
    const sectionFeedbacks = await this.generateSectionFeedbacks(strategy);
    feedbacks.push(...sectionFeedbacks);
    
    // 6. 피드백 최적화 및 조정
    return this.optimizeFeedbacks(feedbacks);
  }

  // 피드백 전략 결정
  private determineStrategy(): FeedbackStrategy {
    const { qualityScore, studentLevel } = this.analysis;
    
    if (qualityScore < 4 || studentLevel === 'beginner') {
      return 'foundational'; // 기초 구조 중심
    } else if (qualityScore >= 7 && studentLevel === 'advanced') {
      return 'refinement'; // 고급 개선 사항
    }
    return 'improvement'; // 균형잡힌 개선
  }

  // 전체 총평 생성
  private async generateOverviewFeedback(): Promise<GeneratedFeedback> {
    const { structure, qualityScore, keyIssues, studentLevel } = this.analysis;
    
    const systemPrompt = this.getSystemPrompt();
    
    const userPrompt = `다음 정보를 바탕으로 학생의 ${this.genre}에 대한 종합적인 피드백을 1-2줄로 작성하세요:

문서 품질 점수: ${qualityScore}/10
학생 수준: ${studentLevel}
구조: 서론(${structure.hasIntroduction ? '있음' : '없음'}), 본론(${structure.bodyParagraphs}개), 결론(${structure.hasConclusion ? '있음' : '없음'})
주요 문제: ${keyIssues.slice(0, 3).map(i => i.description).join(', ') || '없음'}

격려와 함께 가장 중요한 개선 방향 1-2가지를 제시하세요.`;

    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 150,
      temperature: 0.7
    });

    return {
      type: '🌟 전체 총평',
      content: response.choices[0].message.content || '좋은 시작입니다! 구조를 더 명확히 하고 근거를 보강해보세요.',
      insert_at: this.analysis.sections[0]?.start || 0,
      priority: 'critical',
      category: 'overview'
    };
  }

  // 핵심 이슈 기반 피드백 생성
  private async generateIssueBasedFeedbacks(): Promise<GeneratedFeedback[]> {
    const feedbacks: GeneratedFeedback[] = [];
    const { keyIssues, recommendedFeedbackCount } = this.analysis;
    
    // 중요도 순으로 정렬
    const sortedIssues = [...keyIssues].sort((a, b) => {
      const priorityOrder = { 'critical': 0, 'important': 1, 'minor': 2 };
      return priorityOrder[a.type] - priorityOrder[b.type];
    });
    
    // 권장 개수의 절반 정도를 이슈 기반으로 생성
    const issueCount = Math.min(
      Math.floor(recommendedFeedbackCount / 2),
      sortedIssues.length
    );
    
    for (let i = 0; i < issueCount; i++) {
      const issue = sortedIssues[i];
      const feedback = await this.generateIssueFeedback(issue);
      feedbacks.push(feedback);
    }
    
    return feedbacks;
  }

  // 개별 이슈에 대한 피드백 생성
  private async generateIssueFeedback(issue: DocumentAnalysis['keyIssues'][0]): Promise<GeneratedFeedback> {
    const systemPrompt = this.getSystemPrompt();
    
    const userPrompt = `다음 문제에 대한 구체적인 피드백을 1줄로 작성하세요:
문제: ${issue.description}
제안: ${issue.suggestion}

학생이 바로 실행할 수 있는 구체적인 개선 방법을 제시하세요.`;

    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 100,
      temperature: 0.7
    });

    const typeEmoji = issue.type === 'critical' ? '🚨' : issue.type === 'important' ? '⚠️' : '💡';
    
    return {
      type: `${typeEmoji} ${issue.type === 'critical' ? '핵심 개선' : issue.type === 'important' ? '중요 사항' : '개선 제안'}`,
      content: response.choices[0].message.content || issue.suggestion,
      insert_at: issue.location,
      priority: issue.type === 'critical' ? 'critical' : issue.type === 'important' ? 'important' : 'enhancement',
      category: 'issue'
    };
  }

  // 섹션별 전략적 피드백 생성
  private async generateSectionFeedbacks(strategy: FeedbackStrategy): Promise<GeneratedFeedback[]> {
    const feedbacks: GeneratedFeedback[] = [];
    const { sections, recommendedFeedbackCount } = this.analysis;
    
    // 중요도 높은 섹션 선별
    const importantSections = [...sections]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, Math.max(3, recommendedFeedbackCount - 2)); // 총평과 이슈 피드백 제외
    
    for (const section of importantSections) {
      if (feedbacks.length >= recommendedFeedbackCount - 1) break; // 총평 제외
      
      const feedback = await this.generateSectionFeedback(section, strategy);
      if (feedback) {
        feedbacks.push(feedback);
      }
    }
    
    return feedbacks;
  }

  // 개별 섹션 피드백 생성
  private async generateSectionFeedback(
    section: DocumentSection,
    strategy: FeedbackStrategy
  ): Promise<GeneratedFeedback | null> {
    // 전략에 따른 피드백 포커스 결정
    const focus = this.getFeedbackFocus(section, strategy);
    if (!focus) return null;
    
    const systemPrompt = this.getSystemPrompt();
    
    const userPrompt = `다음 문단에 대한 ${focus} 피드백을 1줄로 작성하세요:

문단 내용: ${section.text.slice(0, 200)}...
문단 유형: ${section.type}
식별된 문제: ${section.issues.join(', ') || '없음'}

구체적이고 실행 가능한 제안을 해주세요.`;

    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 100,
      temperature: 0.7
    });

    const typeEmojis: Record<DocumentSection['type'], string> = {
      'introduction': '📝',
      'body': '📊',
      'conclusion': '✨',
      'transition': '🔗',
      'header': '📌',
      'content': '💭'
    };

    return {
      type: `${typeEmojis[section.type]} ${this.getSectionLabel(section.type)}`,
      content: response.choices[0].message.content || '',
      insert_at: section.start,
      priority: section.importance > 7 ? 'important' : 'enhancement',
      category: 'section'
    };
  }

  // 피드백 최적화 및 균등 분산
  private optimizeFeedbacks(feedbacks: GeneratedFeedback[]): GeneratedFeedback[] {
    const { recommendedFeedbackCount, sections } = this.analysis;
    
    // 1. 우선순위별 정렬
    const priorityOrder = { 'critical': 0, 'important': 1, 'enhancement': 2 };
    feedbacks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    // 2. 피드백 분산 전략 적용
    const distributedFeedbacks = this.distributeEvenly(feedbacks, sections);
    
    // 3. 권장 개수로 제한
    let optimized = distributedFeedbacks.slice(0, recommendedFeedbackCount);
    
    // 4. 위치 중복 제거 (너무 가까운 피드백 제거)
    optimized = this.removeDuplicatePositions(optimized);
    
    // 5. 카테고리 균형 맞추기
    optimized = this.balanceCategories(optimized);
    
    // 6. 위치별 정렬 (문서 순서대로)
    optimized.sort((a, b) => a.insert_at - b.insert_at);
    
    console.log(`📍 최종 피드백: ${optimized.length}개 (권장: ${recommendedFeedbackCount}개)`);
    
    return optimized;
  }

  // 피드백을 문서 전체에 균등 분산
  private distributeEvenly(
    feedbacks: GeneratedFeedback[], 
    sections: DocumentSection[]
  ): GeneratedFeedback[] {
    if (sections.length === 0) return feedbacks;
    
    // 본문 섹션만 필터링 (헤더나 짧은 섹션 제외)
    const mainSections = sections.filter(s => 
      s.text.length > 50 && 
      s.type !== 'header'
    );
    
    if (mainSections.length === 0) return feedbacks;
    
    console.log(`📊 피드백 분산: ${mainSections.length}개 본문 섹션에 ${feedbacks.length}개 피드백 배치`);
    
    // 전체 문서를 피드백 개수만큼 균등 분할
    const totalSections = mainSections.length;
    const feedbackCount = feedbacks.length;
    const distributed: GeneratedFeedback[] = [];
    
    // 서론, 본론, 결론 비율: 1:3:1
    const introSections = mainSections.filter(s => s.type === 'introduction');
    const bodySections = mainSections.filter(s => s.type === 'body' || s.type === 'content');
    const conclusionSections = mainSections.filter(s => s.type === 'conclusion');
    
    // 각 부분에 할당할 피드백 개수 계산
    const introCount = Math.min(1, Math.floor(feedbackCount * 0.2));
    const conclusionCount = Math.min(1, Math.floor(feedbackCount * 0.2));
    const bodyCount = feedbackCount - introCount - conclusionCount;
    
    let feedbackIndex = 0;
    
    // 서론에 피드백 배치 (있으면)
    if (introSections.length > 0 && introCount > 0) {
      for (let i = 0; i < introCount && feedbackIndex < feedbacks.length; i++) {
        feedbacks[feedbackIndex].insert_at = introSections[0].start;
        distributed.push(feedbacks[feedbackIndex]);
        feedbackIndex++;
      }
    }
    
    // 본론에 균등 분산
    if (bodySections.length > 0 && bodyCount > 0) {
      const interval = Math.max(1, Math.floor(bodySections.length / bodyCount));
      
      for (let i = 0; i < bodyCount && feedbackIndex < feedbacks.length; i++) {
        // 균등하게 분산된 위치 계산
        const sectionIndex = Math.min(
          Math.floor(i * bodySections.length / bodyCount),
          bodySections.length - 1
        );
        const targetSection = bodySections[sectionIndex];
        
        feedbacks[feedbackIndex].insert_at = targetSection.start;
        distributed.push(feedbacks[feedbackIndex]);
        feedbackIndex++;
      }
    }
    
    // 결론에 피드백 배치 (있으면)
    if (conclusionSections.length > 0 && conclusionCount > 0) {
      for (let i = 0; i < conclusionCount && feedbackIndex < feedbacks.length; i++) {
        feedbacks[feedbackIndex].insert_at = conclusionSections[0].start;
        distributed.push(feedbacks[feedbackIndex]);
        feedbackIndex++;
      }
    }
    
    // 모든 섹션이 없으면 전체에 균등 분산
    if (distributed.length === 0) {
      const step = Math.max(1, Math.floor(mainSections.length / feedbacks.length));
      feedbacks.forEach((f, i) => {
        const idx = Math.min(i * step, mainSections.length - 1);
        f.insert_at = mainSections[idx].start;
        distributed.push(f);
      });
    }
    
    console.log(`✅ 피드백 분산 완료: 서론(${introSections.length}), 본론(${bodySections.length}), 결론(${conclusionSections.length})`);
    
    return distributed;
  }

  // 중복 위치 제거
  private removeDuplicatePositions(feedbacks: GeneratedFeedback[]): GeneratedFeedback[] {
    const MIN_DISTANCE = 50; // 최소 50자 간격
    const filtered: GeneratedFeedback[] = [];
    
    for (const feedback of feedbacks) {
      const tooClose = filtered.some(f => 
        Math.abs(f.insert_at - feedback.insert_at) < MIN_DISTANCE
      );
      
      if (!tooClose || feedback.priority === 'critical') {
        filtered.push(feedback);
      }
    }
    
    return filtered;
  }

  // 카테고리 균형 맞추기
  private balanceCategories(feedbacks: GeneratedFeedback[]): GeneratedFeedback[] {
    const categoryCounts: Record<string, number> = {};
    const balanced: GeneratedFeedback[] = [];
    
    // 각 카테고리별 최대 개수 설정
    const maxPerCategory = Math.ceil(feedbacks.length / 3);
    
    for (const feedback of feedbacks) {
      const count = categoryCounts[feedback.category] || 0;
      
      if (count < maxPerCategory || feedback.priority === 'critical') {
        balanced.push(feedback);
        categoryCounts[feedback.category] = count + 1;
      }
    }
    
    return balanced;
  }

  // 헬퍼 메서드들
  private getSystemPrompt(): string {
    return `당신은 완도고등학교 학생들의 프로젝트 멘토입니다.

역할:
- 학생 수준에 맞춘 맞춤형 피드백 제공
- 구체적이고 실행 가능한 제안
- 격려와 개선점의 균형

피드백 원칙:
1. 1-2줄로 간결하게 작성
2. 마크다운 문법 사용 금지 (**, *, #, \` 등)
3. 학생이 바로 적용할 수 있는 구체적 제안
4. 긍정적이고 건설적인 톤 유지`;
  }

  private getFeedbackFocus(section: DocumentSection, strategy: FeedbackStrategy): string | null {
    const focusMap: Record<FeedbackStrategy, Record<DocumentSection['type'], string | null>> = {
      'foundational': {
        'introduction': '목적과 방향 명확화',
        'body': '주장과 근거 연결',
        'conclusion': '핵심 요약',
        'transition': null,
        'header': null,
        'content': '기본 구조'
      },
      'improvement': {
        'introduction': '독자 관심 유도',
        'body': '논리적 전개',
        'conclusion': '시사점 제시',
        'transition': '자연스러운 연결',
        'header': '구조 명확성',
        'content': '내용 충실도'
      },
      'refinement': {
        'introduction': '창의적 도입',
        'body': '심층 분석',
        'conclusion': '통찰력 있는 마무리',
        'transition': '유려한 전환',
        'header': '체계적 구성',
        'content': '전문성 향상'
      }
    };
    
    return focusMap[strategy][section.type];
  }

  private getSectionLabel(type: DocumentSection['type']): string {
    const labels: Record<DocumentSection['type'], string> = {
      'introduction': '도입부',
      'body': '본론',
      'conclusion': '결론',
      'transition': '연결',
      'header': '구조',
      'content': '내용'
    };
    
    return labels[type];
  }
}