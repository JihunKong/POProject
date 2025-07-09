import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  debug: true, // 디버깅을 위해 임시로 활성화
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
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('SignIn attempt:', {
        email: user?.email,
        name: user?.name,
        provider: account?.provider,
        accountId: account?.providerAccountId
      });
      
      // 특정 이메일 디버깅
      if (user?.email === 'mokpo20_t70@h.jne.go.kr') {
        console.log('Special debug for mokpo20_t70@h.jne.go.kr:', {
          user,
          account,
          profile
        });
        
        // 명시적으로 이 이메일 허용
        return true;
      }
      
      // Google 계정인지 확인
      if (account?.provider !== 'google') {
        console.log('Non-Google provider attempted:', account?.provider);
        return false;
      }
      
      try {
        // 모든 Google 계정 허용
        return true;
      } catch (error) {
        console.error('SignIn error:', error);
        return false;
      }
    },
    async session({ session, token }) {
      if (session?.user && token.sub) {
        session.user.id = token.sub;
      }
      
      return session;
    },
    async jwt({ token, user }) {
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
  },
  secret: process.env.NEXTAUTH_SECRET,
});