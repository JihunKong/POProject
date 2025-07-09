import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  debug: process.env.NODE_ENV === 'development', // 개발 환경에서만 디버그 활성화
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile',
          prompt: 'select_account', // 계정 선택 화면 표시
        },
      },
      allowDangerousEmailAccountLinking: true, // 이메일 기반 계정 자동 연결 허용
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('SignIn attempt:', {
        email: user?.email,
        name: user?.name,
        provider: account?.provider
      });
      
      // Google 계정인지 확인
      if (account?.provider !== 'google') {
        console.log('Non-Google provider attempted:', account?.provider);
        return false;
      }
      
      // 모든 Google 계정 허용
      // allowDangerousEmailAccountLinking이 true이므로 
      // 동일한 이메일의 기존 사용자와 자동으로 연결됨
      return true;
    },
    async session({ session, token }) {
      if (session?.user && token.sub) {
        session.user.id = token.sub;
      }
      
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth-error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30일
  },
  secret: process.env.NEXTAUTH_SECRET,
});