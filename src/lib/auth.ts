import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // 학교 도메인 확인
      const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN || 'wando.hs.kr';
      const email = user.email || '';
      
      if (!email.endsWith(`@${allowedDomain}`)) {
        return false; // 로그인 거부
      }
      
      return true;
    },
    async session({ session, token }) {
      if (session?.user && token.sub) {
        // 데이터베이스에서 사용자 정보 가져오기
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { 
            id: true, 
            role: true, 
            studentId: true, 
            classRoom: true 
          },
        });
        
        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.role = dbUser.role;
          session.user.studentId = dbUser.studentId;
          session.user.classRoom = dbUser.classRoom;
        }
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