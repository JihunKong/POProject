# Railway 배포 가이드 및 환경 설정

## 프로젝트 구조
```
pure-ocean-project/
├── .env.local
├── .gitignore
├── package.json
├── next.config.js
├── tailwind.config.js
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts
│   │   │   ├── chat/
│   │   │   │   └── route.ts
│   │   │   └── analytics/
│   │   │       └── route.ts
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   └── chat/
│   │       └── page.tsx
│   ├── components/
│   │   ├── ChatInterface.tsx
│   │   ├── TeamDashboard.tsx
│   │   └── Navigation.tsx
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── openai.ts
│   │   └── auth.ts
│   └── types/
│       └── index.ts
└── public/
```

## Railway 배포 단계별 가이드

### 1단계: Railway 계정 설정
```bash
# Railway CLI 설치 (선택사항)
npm install -g @railway/cli

# 로그인
railway login
```

### 2단계: 프로젝트 초기화
```bash
# Next.js 프로젝트 생성
npx create-next-app@latest pure-ocean-project --typescript --tailwind --app

# 프로젝트 디렉토리로 이동
cd pure-ocean-project

# 필수 패키지 설치
npm install next-auth@beta @prisma/client @next-auth/prisma-adapter
npm install openai react-query axios
npm install -D @types/node prisma
```

### 3단계: 환경 변수 설정

**.env.local** (개발용)
```env
# 데이터베이스
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# 학교 도메인
ALLOWED_EMAIL_DOMAIN="wando.hs.kr"
```

### 4단계: Railway 프로젝트 생성

1. [Railway 대시보드](https://railway.app) 접속
2. "New Project" 클릭
3. "Deploy from GitHub repo" 선택
4. GitHub 리포지토리 연결
5. "Add Service" → "Database" → "PostgreSQL" 추가

### 5단계: Railway 환경 변수 설정

Railway 대시보드에서 다음 환경 변수 추가:
- `NEXTAUTH_URL`: https://your-app-name.up.railway.app
- `NEXTAUTH_SECRET`: 랜덤 문자열 생성
- `GOOGLE_CLIENT_ID`: Google Cloud Console에서 획득
- `GOOGLE_CLIENT_SECRET`: Google Cloud Console에서 획득
- `OPENAI_API_KEY`: OpenAI 대시보드에서 획득
- `ALLOWED_EMAIL_DOMAIN`: wando.hs.kr

### 6단계: 배포 설정

**railway.json**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**package.json 스크립트 추가**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "postinstall": "prisma generate"
  }
}
```

## 비용 최적화 팁

### Railway 비용 예상 (1주일)
- **Hobby Plan**: $5/월 (약 ₩7,000)
- **PostgreSQL**: 500MB 무료
- **예상 사용량**: 
  - 111명 동시 사용: ~2GB RAM
  - 일일 요청: ~10,000회
  - **총 예상 비용**: ₩15,000-20,000

### 비용 절감 전략
1. **자동 슬립 설정**: 야간 시간대 서버 중지
2. **캐싱 활용**: Redis 대신 메모리 캐시 사용
3. **이미지 최적화**: Next.js Image 컴포넌트 활용
4. **API 호출 최소화**: 클라이언트 사이드 캐싱

## 모니터링 및 로깅

### Railway 로그 확인
```bash
# CLI로 로그 확인
railway logs

# 웹 대시보드에서도 실시간 로그 확인 가능
```

### 성능 모니터링
Railway 대시보드에서 제공하는 메트릭:
- CPU 사용률
- 메모리 사용량
- 네트워크 I/O
- 응답 시간

## 문제 해결 가이드

### 자주 발생하는 문제

1. **빌드 실패**
   - Prisma 스키마 확인
   - 환경 변수 누락 확인
   - TypeScript 에러 해결

2. **데이터베이스 연결 실패**
   - DATABASE_URL 형식 확인
   - Railway PostgreSQL 서비스 상태 확인

3. **인증 오류**
   - NEXTAUTH_URL이 배포 URL과 일치하는지 확인
   - Google OAuth 리디렉션 URI 확인

### 긴급 대응 방안
```bash
# 서비스 재시작
railway restart

# 이전 버전으로 롤백
railway rollback

# 환경 변수 확인
railway variables
```

## 보안 체크리스트

- [ ] 모든 환경 변수가 Railway에 안전하게 저장됨
- [ ] NEXTAUTH_SECRET이 충분히 복잡함
- [ ] 학교 도메인으로만 로그인 제한됨
- [ ] API 라우트에 인증 미들웨어 적용됨
- [ ] SQL 인젝션 방지 (Prisma ORM 사용)
- [ ] XSS 방지 (React 기본 보호)
- [ ] CSRF 보호 (NextAuth 내장)