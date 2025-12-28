import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('=== 로그인 시도 디버그 정보 ===');
      console.log('User:', user);
      console.log('Account:', account);
      console.log('Profile:', profile);
      console.log('Email:', user.email);
      console.log('Provider:', account?.provider);
      console.log('========================');
      
      // 모든 Google 계정 허용
      return true;
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
  debug: true, // 디버그 모드 활성화
});