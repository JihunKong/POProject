# Pure Ocean 비동기 문서 첨삭 시스템

## 개요

Pure Ocean 플랫폼의 문서 첨삭 기능이 완전히 새로운 비동기 처리 시스템으로 업그레이드되었습니다. 이제 504 Gateway Timeout 문제 없이 안전하고 효율적으로 문서 첨삭을 처리할 수 있습니다.

## 주요 개선사항

### 1. 504 Gateway Timeout 완전 해결
- **이전**: 20분 처리 시간으로 인한 타임아웃 발생
- **현재**: 1초 내 즉시 응답, 백그라운드에서 안전 처리

### 2. 실시간 진행률 추적
- 4단계 처리 과정의 실시간 진행률 표시
- 예상 소요 시간 및 남은 시간 계산
- 각 단계별 상세 상태 확인 가능

### 3. 브라우저 알림 시스템
- 첨삭 완료 시 브라우저 푸시 알림
- 실패 시 즉시 알림 발송
- 백그라운드에서 처리되므로 브라우저를 닫아도 작업 계속

### 4. Google Docs 변경 감지
- 실제 문서 수정 확인을 통한 완료 검증
- Revision 기반 변경 감지 시스템
- 코멘트 수 증가 확인을 통한 이중 검증

## 시스템 아키텍처

### 데이터베이스 스키마
```prisma
model DocumentFeedbackJob {
  id              String            @id @default(cuid())
  userId          String
  documentId      String
  documentUrl     String
  genre           String
  status          DocumentJobStatus @default(PENDING)
  progress        Int              @default(0)
  currentStep     String?
  totalSteps      Int              @default(4)
  error           String?
  startedAt       DateTime         @default(now())
  completedAt     DateTime?
  
  // Google Docs 변경 추적
  initialRevision String?
  finalRevision   String?
  commentsAdded   Int             @default(0)
  
  // 진행률 세부 정보  
  stepDetails     Json?           // 각 단계별 상태
  estimatedTime   Int?            // 예상 소요 시간 (분)
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum DocumentJobStatus {
  PENDING     // 대기중
  PROCESSING  // 처리중
  COMPLETED   // 완료
  FAILED      // 실패
  CANCELLED   // 취소
}
```

### API 엔드포인트

#### 1. POST `/api/docs/feedback`
**작업 시작** - 즉시 jobId 반환
```typescript
// 요청
{
  genre: string,
  docUrl: string
}

// 응답 (1초 내)
{
  jobId: string,
  status: "PENDING",
  progress: 0,
  estimatedTime: 15,
  message: "작업이 시작되었습니다"
}
```

#### 2. GET `/api/docs/feedback/status/[jobId]`
**상태 확인** - 3초마다 폴링
```typescript
// 응답
{
  jobId: string,
  status: "PROCESSING" | "COMPLETED" | "FAILED",
  progress: number, // 0-100
  currentStep: string,
  estimatedTimeRemaining: number, // 분
  stepDetails: {
    documentAccess: "completed" | "pending" | "failed",
    contentAnalysis: "completed" | "pending" | "failed",
    feedbackGeneration: "completed" | "pending" | "failed",
    documentUpdate: "completed" | "pending" | "failed"
  },
  successMessage?: string, // 완료 시
  error?: string // 실패 시
}
```

#### 3. POST `/api/docs/feedback/retry/[jobId]`
**재시도** - 실패한 작업 재시도
```typescript
// 응답
{
  jobId: string,
  status: "PENDING",
  progress: 0,
  message: "작업을 재시도합니다"
}
```

### 처리 단계

#### 1. 문서 접근 확인 (10% - 25%)
- Google Docs API 권한 확인
- 초기 문서 상태 기록 (revision, 코멘트 수)
- 문서 내용 읽기 권한 확인

#### 2. 문서 내용 분석 (25% - 50%)
- 문서 텍스트 추출 및 구조 분석
- 섹션별 내용 분류
- 빈 템플릿 vs 작성된 내용 구분

#### 3. AI 피드백 생성 (50% - 75%)
- OpenAI API를 통한 종합 평가
- 섹션별 맞춤형 피드백 생성
- Pure Ocean 프로젝트 기준 적용

#### 4. 문서 업데이트 (75% - 90%)
- Google Docs API로 인라인 피드백 삽입
- 스타일링 적용 (파란색 배경, 구분선)
- 피드백 위치 최적화

#### 5. 변경 감지 (90% - 100%)
- 5분간 문서 변경 감지 모니터링
- Revision 및 코멘트 수 변화 확인
- 실제 완료 확인 후 작업 종료

## 프론트엔드 구현

### React Hook 사용
```typescript
import { useDocumentFeedback } from '@/hooks/useDocumentFeedback';

function DocumentTab() {
  const {
    currentJobId,
    jobStatus,
    isSubmitting,
    startFeedback,
    resetJob
  } = useDocumentFeedback();

  // 작업 시작
  const handleStart = async () => {
    await startFeedback(genre, docUrl);
  };

  // 실시간 상태 확인 (자동 폴링)
  if (jobStatus) {
    console.log(`진행률: ${jobStatus.progress}%`);
    console.log(`현재 단계: ${jobStatus.currentStep}`);
  }
}
```

### 브라우저 알림
```typescript
import { useNotifications } from '@/lib/notifications';

function Component() {
  const { notifyDocumentCompleted } = useNotifications();
  
  // 완료 시 자동 알림
  useEffect(() => {
    if (jobStatus?.status === 'COMPLETED') {
      notifyDocumentCompleted(documentTitle, documentUrl);
    }
  }, [jobStatus]);
}
```

## 설치 및 설정

### 1. 데이터베이스 마이그레이션
```bash
npx prisma db push
```

### 2. Prisma 클라이언트 생성
```bash
npx prisma generate
```

### 3. 환경 변수 확인
```bash
# Google Service Account 설정 필수
GOOGLE_SERVICE_ACCOUNT={"type":"service_account",...}
UPSTAGE_API_KEY=your_upstage_api_key
DATABASE_URL=postgresql://...
```

## 사용 방법

### 1. 기본 사용
1. 문서 첨삭 탭으로 이동
2. Google Docs URL 입력
3. 첨삭 유형 선택 (워크시트/보고서/발표자료)
4. "첨삭 요청하기" 버튼 클릭
5. 실시간 진행률 확인
6. 완료 알림 받기

### 2. 브라우저 알림 설정
1. 첫 사용 시 알림 권한 요청 배너 표시
2. "알림 허용하기" 버튼 클릭
3. 브라우저 권한 승인
4. 이후 자동으로 완료/실패 알림 수신

### 3. 재시도
1. 실패한 작업의 경우 재시도 버튼 표시
2. 버튼 클릭으로 동일한 설정으로 재시도
3. 새로운 진행률로 실시간 추적

## 모니터링 및 디버깅

### 로그 확인
```bash
# 백그라운드 작업 로그
📝 Starting background processing for job abc123
🔍 Detecting document changes for job abc123
✅ Background processing completed for job abc123

# 에러 로그
❌ Background processing failed for job abc123: Error message
```

### 데이터베이스 확인
```bash
npx prisma studio
# DocumentFeedbackJob 테이블에서 작업 상태 확인
```

## 성능 최적화

### 폴링 최적화
- 완료/실패 시 자동으로 폴링 중단
- 3초 간격으로 효율적 상태 확인
- 캐시 타임 5분으로 중복 요청 방지

### 백그라운드 처리
- Node.js 이벤트 루프 활용
- Promise 체인으로 순차 처리
- 에러 발생 시 상태 업데이트 보장

### Google API 최적화
- 필요한 필드만 선택적 조회
- Rate Limit 고려한 지연 시간
- 변경 감지 효율화 (5초 간격)

## 보안 고려사항

### 권한 확인
- 작업 소유자 확인 강화
- Session 기반 인증 유지
- Google Docs 편집 권한 필수

### 에러 처리
- 민감한 정보 노출 방지
- 사용자 친화적 에러 메시지
- 시스템 로그와 사용자 메시지 분리

## 향후 개선 계획

### Phase 2 기능
- [ ] 작업 취소 기능
- [ ] 배치 처리 (여러 문서 동시 처리)
- [ ] 사용자 커스텀 알림 설정
- [ ] 처리 이력 대시보드

### Phase 3 기능
- [ ] WebSocket 실시간 통신 (HTTP 폴링 대체)
- [ ] AI 모델 성능 최적화
- [ ] 다국어 피드백 지원
- [ ] 템플릿 기반 자동 첨삭

## 문제 해결

### 일반적인 문제
1. **"Job not found" 오류**: 브라우저 캐시 삭제 후 재시도
2. **권한 오류**: Google Docs 편집자 권한 확인
3. **타임아웃**: 문서를 여러 부분으로 나누어 처리
4. **알림이 안 옴**: 브라우저 설정에서 알림 권한 확인

### 기술적 문제
1. **데이터베이스 연결 오류**: `DATABASE_URL` 확인
2. **Google API 오류**: `GOOGLE_SERVICE_ACCOUNT` 설정 확인
3. **AI API 오류**: `UPSTAGE_API_KEY` 유효성 확인

이제 Pure Ocean 플랫폼의 문서 첨삭 시스템은 안정적이고 사용자 친화적인 비동기 처리 시스템으로 완전히 업그레이드되었습니다. 504 Gateway Timeout 문제는 더 이상 발생하지 않으며, 사용자는 실시간으로 진행 상황을 확인할 수 있습니다.