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
  }
};

// Google Docs 서비스 인스턴스 생성
export function getGoogleDocsService() {
  try {
    const serviceAccountInfo = process.env.GOOGLE_SERVICE_ACCOUNT;
    if (!serviceAccountInfo) {
      throw new Error('Google service account information is missing');
    }

    const credentials = JSON.parse(serviceAccountInfo);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive.file'
      ],
    });

    return google.docs({ version: 'v1', auth });
  } catch (error) {
    console.error('Failed to initialize Google Docs service:', error);
    throw error;
  }
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

// Google Docs에 피드백 삽입
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
    for (const feedback of feedbacks.reverse()) {
      // 피드백 텍스트 포맷팅
      const feedbackText = `\n\n[AI 평가 - ${feedback.type}]\n${feedback.content}\n${'─'.repeat(50)}\n`;
      
      // 텍스트 삽입 요청
      requests.push({
        insertText: {
          location: {
            index: feedback.insert_at
          },
          text: feedbackText
        }
      });
      
      // 피드백 스타일 적용
      const textLength = feedbackText.length;
      requests.push({
        updateTextStyle: {
          range: {
            startIndex: feedback.insert_at,
            endIndex: feedback.insert_at + textLength
          },
          textStyle: {
            foregroundColor: {
              color: {
                rgbColor: {
                  red: 0.0,
                  green: 0.0,
                  blue: 0.8
                }
              }
            },
            backgroundColor: {
              color: {
                rgbColor: {
                  red: 0.95,
                  green: 0.95,
                  blue: 1.0
                }
              }
            },
            italic: true
          },
          fields: 'foregroundColor,backgroundColor,italic'
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
    console.error('Error inserting feedback:', error);
    throw error;
  }
}