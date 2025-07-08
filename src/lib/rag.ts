import { readFileSync } from 'fs';
import path from 'path';

// 프로젝트 문서들을 메모리에 저장
interface Document {
  id: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

// 프로젝트 관련 문서들을 로드하는 함수
export function loadProjectDocuments(): Document[] {
  const documents: Document[] = [];
  
  try {
    // student-guide.md 로드
    const studentGuidePath = path.join(process.cwd(), 'student-guide.md');
    const studentGuideContent = readFileSync(studentGuidePath, 'utf-8');
    documents.push({
      id: 'student-guide',
      title: 'Pure Ocean Project 학생 가이드북',
      content: studentGuideContent,
      metadata: { type: 'guide' }
    });
    
    // student-worksheet.md 로드
    const worksheetPath = path.join(process.cwd(), 'student-worksheet.md');
    const worksheetContent = readFileSync(worksheetPath, 'utf-8');
    documents.push({
      id: 'student-worksheet',
      title: 'Pure Ocean Project 워크시트',
      content: worksheetContent,
      metadata: { type: 'worksheet' }
    });
    
    // 프로젝트 일정 정보
    documents.push({
      id: 'schedule',
      title: '프로젝트 일정',
      content: `
Pure Ocean Project 일정:
- 기간: 2025년 7월 14일(월) ~ 7월 18일(금)
- 시간: 매일 오전 9시 ~ 오후 5시
- Day 1 (7/14): 시작과 만남 - 프로젝트 소개, 팀 만들기
- Day 2 (7/15): 문제 발견 - 우리 주변 문제 탐색
- Day 3 (7/16): 해결책 찾기 - 아이디어 브레인스토밍
- Day 4 (7/17): 완성하기 - 최종 작품 완성
- Day 5 (7/18): 공유와 축하 - 발표회
      `,
      metadata: { type: 'schedule' }
    });
    
    // SDGs 정보
    documents.push({
      id: 'sdgs',
      title: 'SDGs와 프로젝트',
      content: `
지속가능발전목표(SDGs)와 프로젝트 연계:
- SDG 1: 빈곤 종식
- SDG 2: 기아 종식
- SDG 3: 건강과 웰빙
- SDG 4: 양질의 교육
- SDG 5: 성평등
- SDG 6: 깨끗한 물과 위생
- SDG 7: 에너지
- SDG 8: 양질의 일자리와 경제성장
- SDG 9: 혁신과 인프라
- SDG 10: 불평등 감소
- SDG 11: 지속가능한 도시
- SDG 12: 책임감 있는 소비와 생산
- SDG 13: 기후 행동
- SDG 14: 해양 생태계
- SDG 15: 육상 생태계
- SDG 16: 평화와 정의
- SDG 17: 파트너십

프로젝트는 이 중 하나 이상의 SDGs와 연결되어야 합니다.
      `,
      metadata: { type: 'sdgs' }
    });
    
    // 설문조사 템플릿
    documents.push({
      id: 'survey-template',
      title: '설문조사 템플릿',
      content: `
설문조사 작성 가이드:
1. 인구통계학적 질문 (나이, 성별, 거주지 등)
2. 문제 인식 관련 질문
3. 해결책에 대한 의견
4. 참여 의향
5. 추가 의견 (주관식)

질문 유형:
- 선택형 (단일/복수)
- 척도형 (1-5점, 1-10점)
- 주관식 (단답형/서술형)
      `,
      metadata: { type: 'template' }
    });
    
  } catch (error) {
    console.error('Error loading documents:', error);
  }
  
  return documents;
}

// 간단한 텍스트 검색 함수
export function searchDocuments(query: string, documents: Document[]): Document[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(' ').filter(word => word.length > 1);
  
  // 각 문서에 대해 관련성 점수 계산
  const scoredDocs = documents.map(doc => {
    let score = 0;
    const contentLower = doc.content.toLowerCase();
    const titleLower = doc.title.toLowerCase();
    
    // 제목에 포함된 단어는 가중치를 높게
    queryWords.forEach(word => {
      if (titleLower.includes(word)) score += 3;
      if (contentLower.includes(word)) score += 1;
    });
    
    // 전체 쿼리가 포함되어 있으면 추가 점수
    if (contentLower.includes(queryLower)) score += 2;
    
    return { doc, score };
  });
  
  // 점수가 높은 순으로 정렬하고 점수가 0보다 큰 것만 반환
  return scoredDocs
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.doc);
}

// 문서 내용을 청크로 분할
export function splitIntoChunks(content: string, chunkSize: number = 500): string[] {
  const lines = content.split('\n');
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const line of lines) {
    if (currentChunk.length + line.length > chunkSize) {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = line;
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line;
    }
  }
  
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

// 관련 컨텍스트 추출
export function getRelevantContext(query: string, documents: Document[], maxChunks: number = 3): string {
  const relevantDocs = searchDocuments(query, documents);
  let context = '';
  let chunksAdded = 0;
  
  for (const doc of relevantDocs) {
    if (chunksAdded >= maxChunks) break;
    
    const chunks = splitIntoChunks(doc.content);
    const queryLower = query.toLowerCase();
    
    // 쿼리와 가장 관련 있는 청크 찾기
    const relevantChunks = chunks
      .map((chunk, index) => ({
        chunk,
        score: chunk.toLowerCase().includes(queryLower) ? 2 : 
               query.split(' ').some(word => chunk.toLowerCase().includes(word.toLowerCase())) ? 1 : 0,
        index
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxChunks - chunksAdded);
    
    for (const item of relevantChunks) {
      context += `\n\n[출처: ${doc.title}]\n${item.chunk}`;
      chunksAdded++;
    }
  }
  
  return context || '관련 문서를 찾을 수 없습니다.';
}