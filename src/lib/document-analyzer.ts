import { openai, DEFAULT_MODEL } from './openai';

// 문서 섹션 타입 정의
export interface DocumentSection {
  title: string;
  start: number;
  end: number;
  text: string;
  type: 'introduction' | 'body' | 'conclusion' | 'transition' | 'header' | 'content';
  importance: number; // 0-10 중요도 점수
  issues: string[]; // 식별된 문제점들
}

// 문서 분석 결과 타입
export interface DocumentAnalysis {
  fullText: string;
  structure: {
    hasIntroduction: boolean;
    hasConclusion: boolean;
    bodyParagraphs: number;
    totalWords: number;
  };
  qualityScore: number; // 0-10 전체 품질 점수
  keyIssues: Array<{
    type: 'critical' | 'important' | 'minor';
    description: string;
    location: number; // 문서 내 위치
    suggestion: string;
  }>;
  sections: DocumentSection[];
  studentLevel: 'beginner' | 'intermediate' | 'advanced';
  recommendedFeedbackCount: number; // 권장 피드백 개수
}

export class DocumentAnalyzer {
  private genre: string;
  private contentWithPositions: Array<{
    text: string;
    start: number;
    end: number;
  }>;

  constructor(
    genre: string,
    contentWithPositions: Array<{
      text: string;
      start: number;
      end: number;
    }>
  ) {
    this.genre = genre;
    this.contentWithPositions = contentWithPositions;
  }

  // 목차인지 판별하는 메서드
  private isTableOfContents(text: string): boolean {
    const tocIndicators = [
      '목차', '차례', 'Table of Contents', 'Contents', 'INDEX',
      '목 차', '차 례', '목  차', '차  례' // 띄어쓰기 변형
    ];
    
    // 목차 특징: 짧은 줄이 많고, 숫자나 페이지 번호가 포함됨
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return false;
    
    // 1. 명시적 목차 키워드 체크
    const hasExplicitTOC = tocIndicators.some(indicator => 
      text.toUpperCase().includes(indicator.toUpperCase())
    );
    
    // 2. 목차 패턴 체크 (예: "1. 서론 ........ 3")
    const tocPatterns = [
      /^\d+\.\s+.+\s+\d+$/,  // "1. 서론 3"
      /^제\s*\d+\s*[장절]\s+.+\s+\d+$/,  // "제1장 서론 3"
      /^[IVX]+\.\s+.+\s+\d+$/,  // "I. Introduction 3"
      /^.+\.{3,}\s*\d+$/,  // "서론........3"
      /^.+\s{3,}\d+$/  // "서론     3"
    ];
    
    const matchingLines = lines.filter(line => 
      tocPatterns.some(pattern => pattern.test(line.trim()))
    );
    
    // 3. 짧은 줄 비율 체크 (목차는 대부분 짧은 줄)
    const shortLinesRatio = lines.filter(l => l.length < 60).length / lines.length;
    
    // 4. 페이지 번호 패턴 체크
    const hasPageNumbers = lines.filter(line => /\d+\s*$/.test(line.trim())).length > lines.length * 0.3;
    
    // 종합 판단
    return hasExplicitTOC || 
           (matchingLines.length > 3) || 
           (shortLinesRatio > 0.8 && hasPageNumbers);
  }

  // 목차를 건너뛰고 본문만 추출
  private extractMainContent(): Array<{ text: string; start: number; end: number; }> {
    let tocEndIndex = -1;
    let foundMainContent = false;
    
    // 목차 영역 찾기
    for (let i = 0; i < this.contentWithPositions.length; i++) {
      const text = this.contentWithPositions[i].text;
      
      if (this.isTableOfContents(text)) {
        tocEndIndex = i;
        // 목차 다음 몇 개 항목도 체크 (연속된 목차 페이지)
        for (let j = i + 1; j < Math.min(i + 5, this.contentWithPositions.length); j++) {
          if (this.isTableOfContents(this.contentWithPositions[j].text)) {
            tocEndIndex = j;
          } else {
            // 본문 시작 감지
            const nextText = this.contentWithPositions[j].text;
            if (nextText.length > 200) { // 충분히 긴 텍스트면 본문으로 간주
              foundMainContent = true;
              break;
            }
          }
        }
        if (foundMainContent) break;
      }
    }
    
    // 목차가 발견되면 그 이후부터, 아니면 처음부터
    const startIndex = tocEndIndex >= 0 ? tocEndIndex + 1 : 0;
    
    console.log(`📚 문서 분석: 총 ${this.contentWithPositions.length}개 섹션 중 ${startIndex}번째부터 본문 시작`);
    
    return this.contentWithPositions.slice(startIndex);
  }

  // 전체 문서 분석 메인 메서드
  async analyzeFullDocument(): Promise<DocumentAnalysis> {
    // 목차를 제외한 본문 추출
    const mainContent = this.extractMainContent();
    const fullText = mainContent.map(item => item.text).join('\n');
    
    // 1. 구조 분석
    const structure = this.analyzeStructure(fullText);
    
    // 2. 섹션 식별 및 중요도 계산 (본문만 대상)
    const sections = await this.identifyAndScoreSections(mainContent);
    
    // 3. AI를 통한 전체 문서 이해
    const aiAnalysis = await this.performAIAnalysis(fullText, sections);
    
    // 4. 품질 점수 계산
    const qualityScore = this.calculateQualityScore(structure, aiAnalysis);
    
    // 5. 학생 수준 판단
    const studentLevel = this.determineStudentLevel(qualityScore, structure);
    
    // 6. 권장 피드백 개수 결정
    const recommendedFeedbackCount = this.calculateRecommendedFeedbackCount(
      studentLevel, 
      qualityScore,
      aiAnalysis.keyIssues.length
    );

    return {
      fullText,
      structure,
      qualityScore,
      keyIssues: aiAnalysis.keyIssues,
      sections,
      studentLevel,
      recommendedFeedbackCount
    };
  }

  // 문서 구조 분석
  private analyzeStructure(fullText: string): DocumentAnalysis['structure'] {
    const words = fullText.split(/\s+/).filter(word => word.length > 0);
    const paragraphs = fullText.split(/\n\n+/);
    
    // 서론/결론 존재 여부 체크
    const hasIntroduction = this.checkForIntroduction(paragraphs[0] || '');
    const hasConclusion = this.checkForConclusion(paragraphs[paragraphs.length - 1] || '');
    
    return {
      hasIntroduction,
      hasConclusion,
      bodyParagraphs: Math.max(0, paragraphs.length - (hasIntroduction ? 1 : 0) - (hasConclusion ? 1 : 0)),
      totalWords: words.length
    };
  }

  // 섹션 식별 및 중요도 점수 계산 (본문 내용만 대상)
  private async identifyAndScoreSections(
    mainContent: Array<{ text: string; start: number; end: number; }>
  ): Promise<DocumentSection[]> {
    const sections: DocumentSection[] = [];
    
    for (let i = 0; i < mainContent.length; i++) {
      const item = mainContent[i];
      const text = item.text.trim();
      
      if (!text) continue;
      
      // 목차로 의심되는 섹션은 건너뛰기 (안전장치)
      if (this.isTableOfContents(text)) {
        console.log(`⚠️ 본문 중 목차로 의심되는 섹션 발견, 건너뜀: ${text.slice(0, 50)}...`);
        continue;
      }
      
      // 섹션 타입 결정
      const type = this.determineSectionType(text, i);
      
      // 중요도 점수 계산
      const importance = await this.calculateImportanceScore(text, type, i);
      
      // 문제점 식별
      const issues = this.identifyIssues(text, type);
      
      sections.push({
        title: this.generateSectionTitle(text, type, i),
        start: item.start,
        end: item.end,
        text,
        type,
        importance,
        issues
      });
    }
    
    console.log(`📝 본문 섹션 분석 완료: ${sections.length}개 섹션 식별됨`);
    
    return sections;
  }

  // AI를 통한 전체 문서 분석
  private async performAIAnalysis(
    fullText: string, 
    sections: DocumentSection[]
  ): Promise<{ keyIssues: DocumentAnalysis['keyIssues'] }> {
    const systemPrompt = `당신은 교육 전문가입니다. 고등학생의 ${this.genre} 문서를 분석하고 있습니다.
    
역할:
1. 문서 전체를 읽고 맥락을 이해
2. 가장 중요한 개선 필요 영역 식별
3. 교육적 가치가 높은 피드백 위치 선정

평가 기준:
- 논리적 흐름
- 주장과 근거의 일치성
- 문서 구조의 완성도
- 학습 목표 달성도`;

    const userPrompt = `다음 문서를 전체적으로 분석하고 핵심 문제점을 식별해주세요:

문서 내용:
${fullText.slice(0, 4000)}...

문서 구조:
- 총 ${sections.length}개 섹션
- 서론: ${sections.filter(s => s.type === 'introduction').length > 0 ? '있음' : '없음'}
- 본론: ${sections.filter(s => s.type === 'body').length}개 단락
- 결론: ${sections.filter(s => s.type === 'conclusion').length > 0 ? '있음' : '없음'}

다음 형식으로 5-7개의 핵심 이슈를 식별해주세요:
1. [긴급/중요/보통] 문제 설명 | 위치(대략적) | 개선 제안`;

    try {
      const response = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 800,
        temperature: 0.7
      });

      const content = response.choices[0].message.content || '';
      return this.parseAIAnalysisResponse(content, sections);
    } catch (error) {
      console.error('AI analysis error:', error);
      return { keyIssues: [] };
    }
  }

  // AI 응답 파싱
  private parseAIAnalysisResponse(
    response: string, 
    sections: DocumentSection[]
  ): { keyIssues: DocumentAnalysis['keyIssues'] } {
    const keyIssues: DocumentAnalysis['keyIssues'] = [];
    const lines = response.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const match = line.match(/\[(긴급|중요|보통)\]\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)/);
      if (match) {
        const [_, priority, description, locationHint, suggestion] = match;
        
        // 위치 추정
        const location = this.estimateLocation(locationHint, sections);
        
        keyIssues.push({
          type: priority === '긴급' ? 'critical' : priority === '중요' ? 'important' : 'minor',
          description: description.trim(),
          location,
          suggestion: suggestion.trim()
        });
      }
    }
    
    return { keyIssues };
  }

  // 섹션 타입 결정
  private determineSectionType(text: string, index: number): DocumentSection['type'] {
    const lowerText = text.toLowerCase();
    
    // 서론 키워드
    if (index === 0 || lowerText.includes('서론') || lowerText.includes('들어가며') || 
        lowerText.includes('배경') || lowerText.includes('개요')) {
      return 'introduction';
    }
    
    // 결론 키워드
    if (lowerText.includes('결론') || lowerText.includes('마치며') || 
        lowerText.includes('정리') || lowerText.includes('종합')) {
      return 'conclusion';
    }
    
    // 전환 구문
    if (lowerText.match(/^(그러나|하지만|그런데|한편|또한|게다가)/)) {
      return 'transition';
    }
    
    // 제목/헤더 (짧고 구조적)
    if (text.length < 50 && !text.includes('.')) {
      return 'header';
    }
    
    // 본문
    return 'body';
  }

  // 중요도 점수 계산
  private async calculateImportanceScore(
    text: string, 
    type: DocumentSection['type'],
    index: number
  ): Promise<number> {
    let score = 5; // 기본 점수
    
    // 타입별 기본 점수
    const typeScores = {
      'introduction': 8,
      'conclusion': 8,
      'transition': 6,
      'body': 5,
      'header': 4,
      'content': 5
    };
    score = typeScores[type];
    
    // 위치 보정 (첫 섹션과 마지막 섹션은 중요)
    if (index === 0) score += 2;
    if (index === this.contentWithPositions.length - 1) score += 1;
    
    // 내용 기반 보정
    if (text.includes('주장') || text.includes('핵심') || text.includes('중요')) score += 1;
    if (text.includes('따라서') || text.includes('그러므로') || text.includes('결과적으로')) score += 1;
    if (text.length < 50) score -= 1; // 너무 짧은 내용
    if (text.length > 500) score += 1; // 충실한 내용
    
    // 문제 신호 감지
    if (!text.includes('.') && text.length > 100) score += 2; // 문장 구분 없음
    if (text.split('.').length === 1 && text.length > 150) score += 1; // 단일 긴 문장
    
    return Math.max(0, Math.min(10, score));
  }

  // 문제점 식별
  private identifyIssues(text: string, type: DocumentSection['type']): string[] {
    const issues: string[] = [];
    
    // 구조적 문제
    if (type === 'body' && !text.includes('.')) {
      issues.push('문장 구분 부족');
    }
    
    // 논리적 문제
    if (text.includes('따라서') || text.includes('그러므로')) {
      const hasEvidence = text.includes('왜냐하면') || text.includes('예를 들어') || 
                         text.includes('증거') || text.includes('연구');
      if (!hasEvidence) {
        issues.push('근거 부족');
      }
    }
    
    // 전환 문제
    if (type === 'transition' && text.length < 30) {
      issues.push('불충분한 전환');
    }
    
    // 서론/결론 문제
    if (type === 'introduction' && !text.includes('목적') && !text.includes('목표') && 
        !text.includes('다루') && !text.includes('소개')) {
      issues.push('목적 불명확');
    }
    
    if (type === 'conclusion' && !text.includes('정리') && !text.includes('결과') && 
        !text.includes('시사') && !text.includes('향후')) {
      issues.push('종합 부족');
    }
    
    return issues;
  }

  // 품질 점수 계산
  private calculateQualityScore(
    structure: DocumentAnalysis['structure'],
    aiAnalysis: { keyIssues: DocumentAnalysis['keyIssues'] }
  ): number {
    let score = 10;
    
    // 구조 완성도
    if (!structure.hasIntroduction) score -= 2;
    if (!structure.hasConclusion) score -= 2;
    if (structure.bodyParagraphs < 2) score -= 1;
    
    // 길이 적절성
    if (structure.totalWords < 200) score -= 2;
    if (structure.totalWords > 2000) score -= 1;
    
    // 식별된 문제 수준
    const criticalIssues = aiAnalysis.keyIssues.filter(i => i.type === 'critical').length;
    const importantIssues = aiAnalysis.keyIssues.filter(i => i.type === 'important').length;
    
    score -= criticalIssues * 1.5;
    score -= importantIssues * 0.5;
    
    return Math.max(0, Math.min(10, score));
  }

  // 학생 수준 판단
  private determineStudentLevel(
    qualityScore: number,
    structure: DocumentAnalysis['structure']
  ): 'beginner' | 'intermediate' | 'advanced' {
    if (qualityScore < 4 || structure.totalWords < 150) {
      return 'beginner';
    }
    if (qualityScore >= 7 && structure.hasIntroduction && structure.hasConclusion) {
      return 'advanced';
    }
    return 'intermediate';
  }

  // 권장 피드백 개수 계산
  private calculateRecommendedFeedbackCount(
    studentLevel: 'beginner' | 'intermediate' | 'advanced',
    qualityScore: number,
    issueCount: number
  ): number {
    // 기본 개수 설정 (줄임)
    const baseCounts = {
      'beginner': 2,      // 3 -> 2
      'intermediate': 3,  // 5 -> 3
      'advanced': 4       // 7 -> 4
    };
    
    let count = baseCounts[studentLevel];
    
    // 품질에 따라 조정
    if (qualityScore < 3) {
      count = Math.min(count, 2); // 너무 많은 피드백 방지
    } else if (qualityScore > 7) {
      count = Math.min(count + 1, 5); // 고급 피드백 추가 (최대 5개)
    }
    
    // 이슈 수에 따라 조정
    if (issueCount > 10) {
      count = Math.min(count, 3); // 문제가 너무 많으면 핵심만
    }
    
    return count;
  }

  // 헬퍼 메서드들
  private checkForIntroduction(text: string): boolean {
    const introKeywords = ['서론', '들어가며', '시작', '배경', '목적', '개요'];
    return introKeywords.some(keyword => text.includes(keyword));
  }

  private checkForConclusion(text: string): boolean {
    const conclusionKeywords = ['결론', '마치며', '정리', '종합', '마무리', '향후'];
    return conclusionKeywords.some(keyword => text.includes(keyword));
  }

  private generateSectionTitle(text: string, type: DocumentSection['type'], index: number): string {
    const preview = text.slice(0, 30).replace(/\n/g, ' ');
    return `${type}_${index}: ${preview}...`;
  }

  private estimateLocation(locationHint: string, sections: DocumentSection[]): number {
    // 위치 힌트를 기반으로 실제 위치 추정
    if (locationHint.includes('시작') || locationHint.includes('서론')) {
      return sections[0]?.start || 0;
    }
    if (locationHint.includes('끝') || locationHint.includes('결론')) {
      return sections[sections.length - 1]?.start || 0;
    }
    if (locationHint.includes('중간') || locationHint.includes('본론')) {
      const midIndex = Math.floor(sections.length / 2);
      return sections[midIndex]?.start || 0;
    }
    return 0;
  }
}