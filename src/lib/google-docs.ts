import { google } from 'googleapis';
import { docs_v1 } from 'googleapis';

// 문서 장르별 평가 기준
export const GENRES = {
  "감상문": {
    description: "독서감상문, 영화감상문 등 작품에 대한 개인적 감상을 표현하는 글",
    structure: [
      "도입부: 작품 소개와 첫인상",
      "전개부: 인상 깊은 장면/내용과 개인적 감상",
      "결론부: 작품이 주는 교훈이나 의미"
    ],
    criteria: "개인적 감상의 진정성, 구체적 근거 제시, 감정 표현의 적절성"
  },
  "비평문": {
    description: "문학작품, 예술작품 등을 객관적으로 분석하고 평가하는 글",
    structure: [
      "서론: 작품 소개와 비평의 관점 제시",
      "본론: 작품의 특징 분석과 평가",
      "결론: 종합적 평가와 의의"
    ],
    criteria: "분석의 객관성, 평가 기준의 명확성, 논리적 일관성"
  },
  "보고서": {
    description: "조사, 실험, 관찰 등의 결과를 체계적으로 정리한 글",
    structure: [
      "서론: 목적과 배경 설명",
      "방법: 조사/실험 방법 설명",
      "결과: 데이터와 발견사항 제시",
      "논의: 결과 해석과 의미 분석",
      "결론: 요약과 제언"
    ],
    criteria: "객관성, 정확성, 체계성, 데이터의 신뢰성"
  },
  "소논문": {
    description: "특정 주제에 대한 학술적 연구를 담은 글",
    structure: [
      "서론: 연구 배경, 목적, 연구 문제",
      "이론적 배경: 선행연구 검토",
      "연구 방법: 연구 설계와 방법론",
      "연구 결과: 분석 결과 제시",
      "논의 및 결론: 시사점과 한계"
    ],
    criteria: "학술적 엄밀성, 논리적 타당성, 독창성, 인용의 정확성"
  },
  "논설문": {
    description: "특정 주제에 대한 주장과 논거를 제시하는 글",
    structure: [
      "서론: 논제 제시와 주장 예고",
      "본론: 논거 제시와 반박 고려",
      "결론: 주장 강조와 설득"
    ],
    criteria: "주장의 명확성, 논거의 타당성, 반박 고려, 설득력"
  },
  "워크시트": {
    description: "Pure Ocean 프로젝트 워크시트 - 7단계 프로젝트 기획 및 실행 계획서",
    structure: [
      "팀 정보: 팀명, 슬로건, 팀원 역할 분담, 팀 규칙",
      "Step 1 문제 발견: 브레인스토밍, 문제 선정, SDGs 연결",
      "Step 2 문제 분석: 5W1H 분석, 현황 조사, 이해관계자 분석",
      "Step 3 해결책 개발: 아이디어 브레인스토밍, 평가, 최종 해결책, 교과 융합",
      "Step 4 실행 계획: 필요 자원, 일정 관리(5일), 결과물 형태",
      "Step 5 기대 효과: SMART 목표, 예상 효과, 성공 측정 방법",
      "Step 6 발표 준비: 핵심 메시지, 발표 구성(10분), 예상 질문",
      "Step 7 성찰: 개인 성찰, 팀 성찰, 최종 체크리스트"
    ],
    criteria: "단계별 완성도, 문제의식의 구체성, SDGs 연계의 적절성, 해결책의 창의성과 실현가능성, 교과 융합의 논리성, 팀워크 계획의 체계성, 성찰의 깊이"
  }
};

// Google 서비스 인스턴스 생성
export function getGoogleServices() {
  try {
    const serviceAccountInfo = process.env.GOOGLE_SERVICE_ACCOUNT;
    if (!serviceAccountInfo) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT 환경변수가 설정되지 않았습니다. GOOGLE_SERVICE_ACCOUNT_SETUP.md를 참조하여 설정해주세요.');
    }

    const credentials = JSON.parse(serviceAccountInfo);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file'
      ],
    });

    const docsService = google.docs({ version: 'v1', auth });
    const driveService = google.drive({ version: 'v3', auth });
    
    return { docsService, driveService };
  } catch (error) {
    console.error('Failed to initialize Google services:', error);
    throw error;
  }
}

// 기존 함수 호환성을 위한 래퍼
export function getGoogleDocsService() {
  return getGoogleServices().docsService;
}

// Google Docs URL에서 문서 ID 추출
export function extractDocumentId(url: string): string | null {
  const patterns = [
    /\/document\/d\/([a-zA-Z0-9-_]+)/,
    /\/d\/([a-zA-Z0-9-_]+)/,
    /docs\.google\.com\/.*[?&]id=([a-zA-Z0-9-_]+)/,
    /^([a-zA-Z0-9-_]+)$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

// 섹션 구분을 위한 헬퍼 함수
export function identifyDocumentSections(contentWithPositions: Array<{
  text: string;
  start: number;
  end: number;
}>) {
  const sections: Array<{
    title: string;
    start: number;
    end: number;
    text: string;
    type: 'header' | 'content' | 'empty';
  }> = [];

  for (let i = 0; i < contentWithPositions.length; i++) {
    const item = contentWithPositions[i];
    const text = item.text.trim();
    
    // 헤더 패턴 식별 (Step, 단계, 제목 등)
    const headerPatterns = [
      /^(Step\s*\d+|단계\s*\d+|STEP\s*\d+)/i,
      /^(팀\s*정보|문제\s*발견|문제\s*분석|해결책\s*개발|실행\s*계획|기대\s*효과|발표\s*준비|성찰)/i,
      /^[\d]+\.\s*[가-힣A-Za-z]/,
      /^[가-힣A-Za-z]{2,10}:\s*/,
      /^(서론|본론|결론|도입부|전개부|결론부|방법|결과|논의)/i
    ];
    
    let isHeader = false;
    let sectionTitle = '';
    
    for (const pattern of headerPatterns) {
      const match = text.match(pattern);
      if (match) {
        isHeader = true;
        sectionTitle = match[0];
        break;
      }
    }
    
    // 빈 섹션 확인
    const meaningfulContent = text.replace(/[\s\n\r_]+/g, ' ').trim();
    const isEmpty = meaningfulContent.length < 20 || 
      meaningfulContent.includes('_______________________________') ||
      /^[_\s]*$/.test(meaningfulContent);
    
    sections.push({
      title: isHeader ? sectionTitle : `섹션 ${i + 1}`,
      start: item.start,
      end: item.end,
      text: text,
      type: isEmpty ? 'empty' : (isHeader ? 'header' : 'content')
    });
  }
  
  return sections;
}

// 개선된 피드백 배치를 위한 헬퍼 함수
export function optimizeFeedbackPlacement(
  sections: ReturnType<typeof identifyDocumentSections>,
  feedbacks: Array<{
    type: string;
    content: string;
    insert_at: number;
  }>
) {
  const optimizedFeedbacks = [...feedbacks];
  
  // 섹션별로 피드백을 그룹화하고 적절한 위치에 배치
  for (let i = 0; i < optimizedFeedbacks.length; i++) {
    const feedback = optimizedFeedbacks[i];
    
    // 해당 피드백이 어느 섹션에 속하는지 찾기
    const targetSection = sections.find(section => 
      feedback.insert_at >= section.start && feedback.insert_at <= section.end
    );
    
    if (targetSection) {
      // 빈 섹션의 경우 섹션 시작 부분에 배치
      if (targetSection.type === 'empty') {
        feedback.insert_at = targetSection.start;
      } else {
        // 내용이 있는 섹션의 경우 섹션 끝에 배치
        feedback.insert_at = targetSection.end - 1;
      }
      
      // 섹션 타입에 따라 피드백 타입 조정
      if (targetSection.type === 'header') {
        feedback.type = `${targetSection.title} - 구조 평가`;
      } else if (targetSection.type === 'empty') {
        feedback.type = `${targetSection.title} - 작성 가이드`;
      } else {
        feedback.type = `${targetSection.title} - 내용 평가`;
      }
    }
  }
  
  return optimizedFeedbacks;
}

// Google Docs 문서 내용 가져오기
export async function getDocumentContent(docsService: docs_v1.Docs, documentId: string) {
  try {
    const doc = await docsService.documents.get({ documentId });
    
    const title = doc.data.title || '제목 없음';
    const contentWithPositions: Array<{
      text: string;
      start: number;
      end: number;
    }> = [];
    
    const content = doc.data.body?.content || [];
    
    for (const element of content) {
      if (element.paragraph) {
        const paragraphText: string[] = [];
        const startIndex = element.startIndex || 0;
        const endIndex = element.endIndex || 0;
        
        for (const textElement of element.paragraph.elements || []) {
          if (textElement.textRun?.content) {
            const text = textElement.textRun.content;
            if (text.trim()) {
              paragraphText.push(text);
            }
          }
        }
        
        if (paragraphText.length > 0) {
          const fullText = paragraphText.join('');
          contentWithPositions.push({
            text: fullText,
            start: startIndex,
            end: endIndex
          });
        }
      }
    }
    
    return { title, contentWithPositions };
  } catch (error) {
    console.error('Error reading document:', error);
    throw error;
  }
}

// Google Docs에 댓글로 피드백 추가 (새로운 방식)
export async function addCommentsToDoc(
  documentId: string,
  feedbacks: Array<{
    type: string;
    content: string;
    insert_at?: number;
  }>
) {
  try {
    const { driveService } = getGoogleServices();
    const MAX_COMMENT_LENGTH = 30000; // Google Drive API 댓글 길이 제한
    let commentsAdded = 0;
    
    for (const feedback of feedbacks) {
      // 댓글 텍스트 포맷팅
      const commentText = `🤖 AI 평가 - ${feedback.type}\n\n${feedback.content}\n\n📝 Pure Ocean AI 멘토가 제공한 피드백입니다.`;
      
      if (commentText.length > MAX_COMMENT_LENGTH) {
        // 긴 댓글을 여러 개로 분할
        const totalChunks = Math.ceil(commentText.length / MAX_COMMENT_LENGTH);
        
        for (let i = 0; i < commentText.length; i += MAX_COMMENT_LENGTH) {
          const chunkNum = Math.floor(i / MAX_COMMENT_LENGTH) + 1;
          let chunk = commentText.slice(i, i + MAX_COMMENT_LENGTH);
          
          // 첫 번째 부분이 아니면 계속 표시 추가
          if (chunkNum > 1) {
            chunk = `(부분 ${chunkNum}/${totalChunks}) ${chunk}`;
          } else if (totalChunks > 1) {
            chunk = `(부분 ${chunkNum}/${totalChunks}) ${chunk}`;
          }
          
          const commentBody = {
            content: chunk
          };
          
          await driveService.comments.create({
            fileId: documentId,
            requestBody: commentBody,
            fields: '*'
          });
          
          commentsAdded++;
          
          // API 호출 간격을 두어 rate limit 방지
          if (chunkNum < totalChunks) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } else {
        const commentBody = {
          content: commentText
        };
        
        await driveService.comments.create({
          fileId: documentId,
          requestBody: commentBody,
          fields: '*'
        });
        
        commentsAdded++;
      }
      
      // 각 피드백 간 간격
      if (feedbacks.indexOf(feedback) < feedbacks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return commentsAdded > 0;
  } catch (error) {
    console.error('Error adding comments to document:', error);
    throw error;
  }
}

// Google Docs의 revision 정보 가져오기 (변경 감지용)
export async function getDocumentRevision(documentId: string): Promise<string> {
  try {
    const { driveService } = getGoogleServices();
    
    const response = await driveService.files.get({
      fileId: documentId,
      fields: 'version,modifiedTime'
    });
    
    // version과 modifiedTime을 조합하여 고유한 revision 생성
    const version = response.data.version || '1';
    const modifiedTime = response.data.modifiedTime || new Date().toISOString();
    
    return `${version}-${modifiedTime}`;
  } catch (error) {
    console.error('Error getting document revision:', error);
    throw error;
  }
}

// 문서의 코멘트 수 가져오기 (완료 확인용)
export async function getDocumentCommentsCount(documentId: string): Promise<number> {
  try {
    const { driveService } = getGoogleServices();
    
    const response = await driveService.comments.list({
      fileId: documentId,
      fields: 'comments'
    });
    
    return response.data.comments?.length || 0;
  } catch (error) {
    console.error('Error getting document comments count:', error);
    return 0;
  }
}

// 문서 변경 감지 (폴링 방식)
export async function detectDocumentChanges(
  documentId: string,
  initialRevision: string,
  initialCommentsCount: number,
  maxWaitTime: number = 300000 // 5분 최대 대기
): Promise<{
  changed: boolean;
  finalRevision: string;
  finalCommentsCount: number;
  changeDetectedAt?: Date;
}> {
  const startTime = Date.now();
  const checkInterval = 5000; // 5초마다 확인
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const currentRevision = await getDocumentRevision(documentId);
      const currentCommentsCount = await getDocumentCommentsCount(documentId);
      
      // revision이 변경되거나 코멘트 수가 증가했으면 변경으로 판단
      if (currentRevision !== initialRevision || currentCommentsCount > initialCommentsCount) {
        return {
          changed: true,
          finalRevision: currentRevision,
          finalCommentsCount: currentCommentsCount,
          changeDetectedAt: new Date()
        };
      }
      
      // 다음 체크까지 대기
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    } catch (error) {
      console.error('Error during change detection:', error);
      // 에러가 발생해도 계속 시도
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }
  
  // 최대 대기 시간 경과
  const finalRevision = await getDocumentRevision(documentId).catch(() => initialRevision);
  const finalCommentsCount = await getDocumentCommentsCount(documentId).catch(() => initialCommentsCount);
  
  return {
    changed: false,
    finalRevision,
    finalCommentsCount
  };
}

// 마크다운을 일반 텍스트로 변환
function convertMarkdownToPlainText(text: string): string {
  // **굵게** -> 굵게
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  // *기울임* -> 기울임
  text = text.replace(/\*([^*]+)\*/g, '$1');
  // `코드` -> 코드
  text = text.replace(/`([^`]+)`/g, '$1');
  // # 제목 -> 제목:
  text = text.replace(/^#+\s+(.+)$/gm, '$1:');
  // [링크](url) -> 링크
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // ### 소제목 -> ■ 소제목
  text = text.replace(/^###\s+(.+)$/gm, '■ $1');
  // ## 중제목 -> ◆ 중제목
  text = text.replace(/^##\s+(.+)$/gm, '◆ $1');
  
  return text;
}

// Google Docs에 피드백을 삽입 (마크다운 변환 포함)
export async function insertFeedbackAsComments(
  docsService: docs_v1.Docs,
  documentId: string,
  feedbacks: Array<{
    type: string;
    content: string;
    insert_at: number;
  }>
) {
  // 현재 Google Docs API v1은 코멘트 API를 지원하지 않으므로
  // 마크다운 변환된 텍스트를 인라인으로 삽입
  return insertFeedbackToDoc(docsService, documentId, feedbacks);
}

// Google Docs에 피드백을 인라인 텍스트로 직접 삽입 (기존 기능 - 폴백용)
export async function insertFeedbackToDoc(
  docsService: docs_v1.Docs,
  documentId: string,
  feedbacks: Array<{
    type: string;
    content: string;
    insert_at: number;
  }>
) {
  try {
    const requests: docs_v1.Schema$Request[] = [];
    
    // 피드백을 역순으로 삽입 (문서 끝부터 시작하여 인덱스가 밀리지 않도록)
    const sortedFeedbacks = [...feedbacks].sort((a, b) => b.insert_at - a.insert_at);
    
    for (const feedback of sortedFeedbacks) {
      // 마크다운 변환
      const plainContent = convertMarkdownToPlainText(feedback.content);
      
      // 섹션별 구분을 위한 헤더 생성
      const sectionHeader = `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      const feedbackHeader = `[AI 평가 - ${feedback.type}]\n`;
      const feedbackContent = `${plainContent}\n`;
      const sectionFooter = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      const fullFeedbackText = sectionHeader + feedbackHeader + feedbackContent + sectionFooter;
      
      // 텍스트 삽입 요청
      requests.push({
        insertText: {
          location: {
            index: feedback.insert_at
          },
          text: fullFeedbackText
        }
      });
      
      // 피드백 전체에 배경색과 테두리 스타일 적용
      const textLength = fullFeedbackText.length;
      requests.push({
        updateTextStyle: {
          range: {
            startIndex: feedback.insert_at,
            endIndex: feedback.insert_at + textLength
          },
          textStyle: {
            backgroundColor: {
              color: {
                rgbColor: {
                  red: 0.94,
                  green: 0.97,
                  blue: 1.0
                }
              }
            }
          },
          fields: 'backgroundColor'
        }
      });
      
      // 헤더 부분에 강조 스타일 적용 (구분선 + AI 평가 라벨)
      const headerLength = sectionHeader.length + feedbackHeader.length;
      requests.push({
        updateTextStyle: {
          range: {
            startIndex: feedback.insert_at,
            endIndex: feedback.insert_at + headerLength
          },
          textStyle: {
            foregroundColor: {
              color: {
                rgbColor: {
                  red: 0.0,
                  green: 0.3,
                  blue: 0.8
                }
              }
            },
            bold: true,
            fontSize: {
              magnitude: 11,
              unit: 'PT'
            }
          },
          fields: 'foregroundColor,bold,fontSize'
        }
      });
      
      // 피드백 내용 부분에 별도 스타일 적용
      const contentStart = feedback.insert_at + headerLength;
      const contentLength = feedbackContent.length;
      requests.push({
        updateTextStyle: {
          range: {
            startIndex: contentStart,
            endIndex: contentStart + contentLength
          },
          textStyle: {
            foregroundColor: {
              color: {
                rgbColor: {
                  red: 0.1,
                  green: 0.1,
                  blue: 0.1
                }
              }
            },
            italic: true,
            fontSize: {
              magnitude: 10,
              unit: 'PT'
            }
          },
          fields: 'foregroundColor,italic,fontSize'
        }
      });
    }
    
    // 문서 업데이트 실행
    if (requests.length > 0) {
      await docsService.documents.batchUpdate({
        documentId,
        requestBody: {
          requests
        }
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error inserting inline feedback:', error);
    throw error;
  }
}