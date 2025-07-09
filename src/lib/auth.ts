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
      }
      
      // Google 계정인지 확인
      if (account?.provider !== 'google') {
        console.log('Non-Google provider attempted:', account?.provider);
        return false;
      }
      
      try {
        // 이메일로 기존 사용자 확인
        if (user?.email) {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: { accounts: true }
          });
          
          console.log('Existing user check:', {
            email: user.email,
            found: !!existingUser,
            hasAccounts: existingUser?.accounts?.length || 0
          });
          
          // 기존 사용자가 있고 Google 계정이 연결되어 있지 않은 경우
          if (existingUser && account) {
            const hasGoogleAccount = existingUser.accounts.some(
              acc => acc.provider === 'google' && acc.providerAccountId === account.providerAccountId
            );
            
            if (!hasGoogleAccount) {
              console.log('Linking Google account to existing user');
              // 계정이 자동으로 연결됨 (allowDangerousEmailAccountLinking: true 설정으로)
            }
          }
        }
        
        // 모든 Google 계정 허용
        return true;
      } catch (error) {
        console.error('SignIn error:', error);
        return false;
      }
    },
    async session({ session, user }) {
      if (session?.user && user) {
        session.user.id = user.id;
      }
      
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth-error',
  },
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30일
  },
  secret: process.env.NEXTAUTH_SECRET,
});