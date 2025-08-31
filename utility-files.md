# 유틸리티 및 설정 파일

## Prisma 클라이언트 설정

**src/lib/prisma.ts**
```typescript
import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
```

## 환경 변수 타입 정의

**src/types/env.d.ts**
```typescript
declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;
    NEXTAUTH_URL: string;
    NEXTAUTH_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    OPENAI_API_KEY: string;
    ALLOWED_EMAIL_DOMAIN: string;
  }
}
```

## Next.js 설정

**next.config.js**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com'], // Google 프로필 이미지
  },
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig
```

## Tailwind CSS 설정

**tailwind.config.ts**
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'ocean-blue': {
          50: '#e6f3ff',
          100: '#b3dbff',
          200: '#80c3ff',
          300: '#4dabff',
          400: '#1a93ff',
          500: '#0080ff',
          600: '#0066cc',
          700: '#004d99',
          800: '#003366',
          900: '#001a33',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'bounce-slow': 'bounce 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
```

## 글로벌 스타일

**src/app/globals.css**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
  }
}

@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
  }

  .btn-secondary {
    @apply px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors;
  }

  .card {
    @apply bg-white rounded-lg shadow-md p-6;
  }

  .input {
    @apply w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500;
  }
}

/* 커스텀 스크롤바 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  @apply bg-gray-100;
}

::-webkit-scrollbar-thumb {
  @apply bg-gray-400 rounded;
}

::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-500;
}

/* 로딩 애니메이션 */
.loading-dots {
  display: inline-flex;
  align-items: center;
}

.loading-dots span {
  animation: blink 1.4s infinite both;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  display: inline-block;
  margin: 0 2px;
  background-color: currentColor;
}

.loading-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0%, 80%, 100% {
    opacity: 0;
  }
  40% {
    opacity: 1;
  }
}
```

## 유틸리티 함수

**src/lib/utils.ts**
```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

export function getProgressStatus(progress: number): {
  status: 'at-risk' | 'needs-attention' | 'on-track';
  color: string;
} {
  if (progress < 30) {
    return { status: 'at-risk', color: 'text-red-600' };
  } else if (progress < 70) {
    return { status: 'needs-attention', color: 'text-yellow-600' };
  } else {
    return { status: 'on-track', color: 'text-green-600' };
  }
}
```

## API 헬퍼

**src/lib/api-helpers.ts**
```typescript
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function requireRole(roles: string[]) {
  const session = await requireAuth();
  if (!roles.includes(session.user.role)) {
    throw new Error('Forbidden');
  }
  return session;
}

export function handleApiError(error: any) {
  console.error('API Error:', error);
  
  if (error.message === 'Unauthorized') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  if (error.message === 'Forbidden') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

## 데이터베이스 초기 설정 스크립트

**scripts/init-db.ts**
```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌊 Pure-Ocean Project 데이터베이스 초기화 시작...');

  // 기본 교사 계정 생성
  const teacherEmail = 'teacher@wando.hs.kr';
  const existingTeacher = await prisma.user.findUnique({
    where: { email: teacherEmail }
  });

  if (!existingTeacher) {
    await prisma.user.create({
      data: {
        email: teacherEmail,
        name: '관리자',
        role: 'TEACHER',
      }
    });
    console.log('✅ 기본 교사 계정 생성 완료');
  }

  // 샘플 학생 데이터 생성 (개발용)
  if (process.env.NODE_ENV === 'development') {
    const sampleStudents = [
      { email: 's20240101@wando.hs.kr', name: '김민준', classRoom: '2-1' },
      { email: 's20240102@wando.hs.kr', name: '이서연', classRoom: '2-1' },
      { email: 's20240103@wando.hs.kr', name: '박지호', classRoom: '2-2' },
    ];

    for (const student of sampleStudents) {
      const existing = await prisma.user.findUnique({
        where: { email: student.email }
      });

      if (!existing) {
        await prisma.user.create({
          data: {
            ...student,
            role: 'STUDENT',
            studentId: student.email.split('@')[0],
          }
        });
      }
    }
    console.log('✅ 샘플 학생 데이터 생성 완료');
  }

  console.log('🎉 데이터베이스 초기화 완료!');
}

main()
  .catch((e) => {
    console.error('❌ 데이터베이스 초기화 오류:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

## package.json 최종 설정

**package.json**
```json
{
  "name": "pure-ocean-project",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "postinstall": "prisma generate",
    "db:push": "prisma db push",
    "db:seed": "tsx scripts/init-db.ts",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@next-auth/prisma-adapter": "^1.0.7",
    "@prisma/client": "^5.7.0",
    "axios": "^1.6.2",
    "clsx": "^2.0.0",
    "next": "14.0.4",
    "next-auth": "^5.0.0-beta.4",
    "openai": "^4.20.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-query": "^3.39.3",
    "tailwind-merge": "^2.1.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.4",
    "@types/react": "^18.2.42",
    "@types/react-dom": "^18.2.17",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.55.0",
    "eslint-config-next": "14.0.4",
    "postcss": "^8.4.32",
    "prisma": "^5.7.0",
    "tailwindcss": "^3.3.6",
    "tsx": "^4.6.2",
    "typescript": "^5.3.3"
  }
}
```

## .gitignore

**.gitignore**
```
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local
.env

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# prisma
prisma/*.db
prisma/*.db-journal

# IDE
.vscode
.idea
```

## EC2 배포 체크리스트

**deployment-checklist.md**
```markdown
# EC2 배포 체크리스트

## 배포 전 확인사항

### 1. 환경 변수
- [ ] DATABASE_URL (EC2 PostgreSQL URL)
- [ ] NEXTAUTH_URL (https://your-app.up.ec2-domain.com)
- [ ] NEXTAUTH_SECRET (openssl rand -base64 32로 생성)
- [ ] GOOGLE_CLIENT_ID
- [ ] GOOGLE_CLIENT_SECRET
- [ ] OPENAI_API_KEY
- [ ] ALLOWED_EMAIL_DOMAIN (wando.hs.kr)

### 2. Google OAuth 설정
- [ ] Google Cloud Console에서 OAuth 2.0 클라이언트 생성
- [ ] 승인된 리디렉션 URI 추가:
  - https://your-app.up.ec2-domain.com/api/auth/callback/google

### 3. 데이터베이스
- [ ] EC2 PostgreSQL 서비스 추가
- [ ] 연결 문자열 확인
- [ ] Prisma 스키마 푸시: `npx prisma db push`

### 4. 빌드 테스트
- [ ] 로컬에서 `npm run build` 성공
- [ ] TypeScript 에러 없음
- [ ] ESLint 경고 해결

### 5. 배포
- [ ] GitHub 리포지토리에 푸시
- [ ] EC2에서 자동 배포 확인
- [ ] 빌드 로그 모니터링

### 6. 배포 후 확인
- [ ] 웹사이트 접속 가능
- [ ] Google 로그인 작동
- [ ] 데이터베이스 연결 정상
- [ ] AI 챗봇 응답 확인

## 문제 해결

### 빌드 실패 시
1. EC2 로그 확인
2. 환경 변수 누락 확인
3. package.json 스크립트 확인

### 데이터베이스 연결 실패 시
1. DATABASE_URL 형식 확인
2. EC2 PostgreSQL 서비스 상태 확인
3. Prisma 스키마 동기화 확인

### 인증 오류 시
1. NEXTAUTH_URL이 배포 URL과 일치하는지 확인
2. Google OAuth 리디렉션 URI 확인
3. NEXTAUTH_SECRET 설정 확인
```