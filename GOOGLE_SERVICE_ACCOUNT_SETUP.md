# 🔐 Google Service Account 설정 가이드
## Pure Ocean Platform - 문서 첨삭 기능용

이 가이드는 Pure Ocean Platform의 Google Docs 문서 첨삭 기능을 위한 Google Service Account 설정 방법을 설명합니다.

## 📋 개요

Google Service Account는 서버에서 Google API에 접근할 때 사용하는 특별한 인증 방식입니다. 사용자 개입 없이 자동으로 Google Docs에 접근하여 피드백을 추가할 수 있습니다.

## 🛠️ 단계별 설정

### 1. Google Cloud Console 접속
1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 기존 프로젝트 선택 또는 새 프로젝트 생성
   - 프로젝트 이름: `Pure Ocean Platform`

### 2. API 활성화
다음 API들을 활성화해야 합니다:

1. **API 및 서비스** → **사용 설정된 API** 이동
2. **+ API 및 서비스 사용 설정** 클릭
3. 다음 API들을 검색하여 활성화:
   ```
   - Google Docs API
   - Google Drive API
   - Google Sheets API (선택사항)
   ```

### 3. Service Account 생성
1. **IAM 및 관리** → **서비스 계정** 이동
2. **+ 서비스 계정 만들기** 클릭
3. 서비스 계정 정보 입력:
   ```
   서비스 계정 이름: Pure Ocean Docs Service
   서비스 계정 ID: pure-ocean-docs-service
   설명: Pure Ocean Platform용 Google Docs API 접근 계정
   ```
4. **만들고 계속하기** 클릭

### 4. 서비스 계정 권한 설정
1. **역할 선택** 단계에서 다음 역할 추가:
   ```
   - 편집자 (Editor) 또는
   - 프로젝트 편집자 (Project Editor)
   ```
2. **계속** 클릭
3. **완료** 클릭

### 5. 서비스 계정 키 생성
1. 생성된 서비스 계정을 클릭
2. **키** 탭으로 이동
3. **키 추가** → **새 키 만들기** 클릭
4. **JSON** 형식 선택 후 **만들기** 클릭
5. JSON 키 파일이 자동으로 다운로드됩니다

⚠️ **중요**: 이 JSON 파일은 매우 중요한 인증 정보입니다. 안전하게 보관하세요!

## 🔧 환경 변수 설정

### 생산 환경 (.env)
다운로드된 JSON 키 파일의 내용을 환경 변수로 설정:

```bash
# Google Service Account JSON (한 줄로 압축)
GOOGLE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"pure-ocean-docs-service@your-project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/pure-ocean-docs-service%40your-project.iam.gserviceaccount.com"}'

# Anthropic API for document analysis (필요시)
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### 개발 환경 (.env.local)
개발용으로 별도의 서비스 계정을 만들거나 같은 계정을 사용할 수 있습니다:

```bash
# 같은 서비스 계정 사용
GOOGLE_SERVICE_ACCOUNT='{"type":"service_account",...}'
```

## 📄 Google Docs 권한 설정

Service Account가 문서에 접근하려면 각 문서에 편집 권한을 부여해야 합니다:

### 방법 1: 개별 문서 공유 (권장)
1. Google Docs 문서를 열고
2. **공유** 버튼 클릭
3. **사용자 및 그룹 추가**에 서비스 계정 이메일 입력:
   ```
   pure-ocean-docs-service@your-project.iam.gserviceaccount.com
   ```
4. **편집자** 권한으로 설정
5. **전송** 클릭

### 방법 2: Google Drive 폴더 공유
1. Google Drive에서 문서들을 담을 폴더 생성
2. 폴더를 서비스 계정과 공유
3. 해당 폴더 내 모든 문서에 자동으로 접근 가능

## 🧪 테스트 방법

### 1. 서비스 계정 연결 테스트
API 엔드포인트를 통해 테스트:

```bash
# 테스트용 Google Docs 문서 생성 후 URL 복사
curl -X POST https://청해.com/api/docs/feedback \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "genre": "워크시트",
    "docUrl": "https://docs.google.com/document/d/YOUR_DOCUMENT_ID/edit"
  }'
```

### 2. 권한 확인
- 서비스 계정이 문서에 접근할 수 있는지 확인
- 피드백이 문서에 정상적으로 추가되는지 확인

## 🚨 보안 주의사항

### 1. 키 관리
- ✅ 서비스 계정 키를 환경 변수로 관리
- ✅ GitHub 등 공개 저장소에 키 업로드 금지
- ✅ 정기적으로 키 교체 (권장: 90일마다)

### 2. 권한 최소화
- ✅ 필요한 최소한의 권한만 부여
- ✅ 불필요한 API 접근 권한 제거
- ✅ 서비스 계정 사용 모니터링

### 3. 접근 로그
```bash
# Google Cloud Console에서 감사 로그 확인
# IAM 및 관리 → 감사 로그
```

## 🔍 문제 해결

### 에러: "Service account key is missing"
```bash
# 환경 변수가 올바르게 설정되었는지 확인
echo $GOOGLE_SERVICE_ACCOUNT
```

### 에러: "Permission denied"
1. 서비스 계정 이메일이 문서에 공유되었는지 확인
2. 편집자 권한으로 공유되었는지 확인
3. 서비스 계정이 활성 상태인지 확인

### 에러: "API not enabled"
1. Google Cloud Console에서 필요한 API가 활성화되었는지 확인
2. 프로젝트 ID가 올바른지 확인

## 📊 성능 최적화

### 1. API 할당량 관리
- Google Docs API: 일일 100,000 요청
- 필요시 할당량 증가 요청

### 2. 캐싱 전략
- 문서 내용 캐싱으로 API 호출 최소화
- 피드백 중복 생성 방지

## ✅ 체크리스트

설정 완료 확인:
- [ ] Google Cloud 프로젝트 생성
- [ ] Google Docs API 활성화
- [ ] Google Drive API 활성화  
- [ ] Service Account 생성
- [ ] Service Account 키 다운로드
- [ ] 환경 변수 설정
- [ ] 테스트 문서 공유
- [ ] API 테스트 완료

---

**설정 완료 후 Pure Ocean Platform의 문서 첨삭 기능을 사용할 수 있습니다!** 🎉

## 📞 지원

문제가 발생할 경우:
1. 이 문서의 문제 해결 섹션 확인
2. Google Cloud Console 감사 로그 확인  
3. 서버 로그 확인 (`pm2 logs pure-ocean-app`)