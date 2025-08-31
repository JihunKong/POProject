# Pure Ocean Chatbot 배포 가이드

## 사전 준비사항

### 1. EC2 계정
- https://ec2-domain.com 에서 GitHub 계정으로 가입
- GitHub 저장소 연결 권한 부여

### 2. Google Cloud Console 설정
- Google Cloud 프로젝트 생성
- OAuth 2.0 클라이언트 ID 생성
- 승인된 리디렉션 URI 추가

### 3. OpenAI API 키
- https://platform.openai.com 에서 API 키 생성
- 사용량 한도 설정 권장

## EC2 배포 단계

### 1. 새 프로젝트 생성
1. EC2 대시보드에서 "New Project" 클릭
2. "Deploy from GitHub repo" 선택
3. `POProject` 저장소 선택

### 2. PostgreSQL 데이터베이스 추가
1. "New" → "Database" → "Add PostgreSQL" 클릭
2. 자동으로 DATABASE_URL 환경 변수 생성됨

### 3. 환경 변수 설정

⚠️ **중요: 절대로 실제 값을 코드에 포함하지 마세요!**

EC2 대시보드에서 Variables 탭으로 이동하여 다음 환경 변수 추가:

```bash
# NextAuth 설정
NEXTAUTH_URL=https://your-app-name.up.ec2-domain.com
NEXTAUTH_SECRET=생성한_시크릿_키

# Google OAuth
GOOGLE_CLIENT_ID=구글에서_받은_클라이언트_ID
GOOGLE_CLIENT_SECRET=구글에서_받은_클라이언트_시크릿

# OpenAI
OPENAI_API_KEY=OpenAI_API_키

# 학교 도메인 (선택사항)
ALLOWED_EMAIL_DOMAIN=wando.hs.kr
```

### 4. NEXTAUTH_SECRET 생성 방법
```bash
openssl rand -base64 32
```

### 5. 배포 확인
- EC2가 자동으로 빌드 및 배포 시작
- 빌드 로그에서 오류 확인
- 배포 완료 후 제공된 URL로 접속

## 보안 주의사항

### 절대 하지 말아야 할 것들:
1. ❌ API 키를 코드에 직접 작성
2. ❌ 환경 변수 파일(.env)을 Git에 커밋
3. ❌ 시크릿 정보를 문서에 포함

### 해야 할 것들:
1. ✅ 모든 시크릿은 환경 변수로 관리
2. ✅ .gitignore에 .env 파일 포함 확인
3. ✅ 정기적으로 API 키 순환
4. ✅ 최소 권한 원칙 적용

## 문제 해결

### 데이터베이스 연결 오류
```bash
npx prisma db push
```

### 빌드 오류
- Node.js 버전 확인
- 종속성 설치 확인
- 환경 변수 설정 확인

### 인증 오류
- NEXTAUTH_URL이 실제 배포 URL과 일치하는지 확인
- Google OAuth 리디렉션 URI 확인
- NEXTAUTH_SECRET 설정 확인