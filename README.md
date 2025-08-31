# Pure-Ocean Project AI Chatbot

완도고등학교 Pure-Ocean Project를 위한 소크라테스식 AI 코칭 챗봇입니다.

## 🌊 프로젝트 소개

이 챗봇은 학생들이 해양 환경 보호 프로젝트를 진행하면서 창의적이고 융합적인 사고를 할 수 있도록 도와주는 AI 도우미입니다. 직접적인 답변 대신 탐구적 질문을 통해 학생들이 스스로 해결책을 찾아갈 수 있도록 안내합니다.

## 🚀 주요 기능

- **소크라테스식 대화**: 질문을 통한 사고력 향상
- **Google OAuth 인증**: 학교 도메인(@wando.hs.kr)만 허용
- **대화 기록 관리**: 이전 대화 이어서 진행 가능
- **실시간 AI 응답**: OpenAI GPT-4 기반
- **진행 상황 추적**: 팀별 프로젝트 진도 관리

## 📋 기술 스택

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with Google OAuth
- **AI**: OpenAI GPT-4
- **Deployment**: AWS EC2

## 🛠️ 설치 및 실행

### 1. 환경 변수 설정

`.env.local.example`을 복사하여 `.env.local` 파일을 생성하고 필요한 값을 입력합니다:

```bash
cp .env.local.example .env.local
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 데이터베이스 설정

```bash
npx prisma db push
```

### 4. 개발 서버 실행

```bash
npm run dev
```

## 🚀 EC2 배포

1. GitHub 저장소에 코드 푸시
2. EC2 인스턴스에 애플리케이션 배포
3. PostgreSQL 데이터베이스 설정
4. PM2 프로세스 매니저 설정
5. 환경 변수 설정:
   - `DATABASE_URL` (PostgreSQL connection string)
   - `NEXTAUTH_URL` (http://your-ec2-domain)
   - `NEXTAUTH_SECRET` (openssl rand -base64 32로 생성)
   - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`
   - `OPENAI_API_KEY`
   - `ALLOWED_EMAIL_DOMAIN` (wando.hs.kr)

## 📝 Google OAuth 설정

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. OAuth 2.0 클라이언트 ID 생성
4. 승인된 리디렉션 URI 추가:
   - 개발: `http://localhost:3000/api/auth/callback/google`
   - 프로덕션: `http://your-ec2-domain/api/auth/callback/google`

## 🔧 개발 명령어

```bash
npm run dev          # 개발 서버 실행
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버 실행
npm run lint         # ESLint 실행
npm run db:push      # 데이터베이스 스키마 동기화
npm run db:studio    # Prisma Studio 실행
```

## 📁 프로젝트 구조

```
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # React 컴포넌트
│   ├── lib/             # 유틸리티 및 설정
│   └── types/           # TypeScript 타입 정의
├── prisma/              # Prisma 스키마
├── public/              # 정적 파일
└── ...설정 파일들
```

## 🤝 기여 방법

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 교육 목적으로 개발되었습니다.

## 👨‍🏫 문의

완도고등학교 공지훈 교사