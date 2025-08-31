import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { prisma } from '@/lib/prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  debug: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
          prompt: "select_account",
        }
      }
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/auth-error',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    signIn: async ({ user, account, profile }) => {
      // Allow sign in for Google accounts
      if (account?.provider === 'google' && user?.email) {
        try {
          // Find or create user in database
          const dbUser = await prisma.user.upsert({
            where: { email: user.email },
            update: {
              name: user.name,
              image: user.image,
            },
            create: {
              email: user.email,
              name: user.name,
              image: user.image,
              role: 'STUDENT', // Default role for new users
            },
          });
          return true;
        } catch (error) {
          console.error('Database error during sign in:', error);
          return false;
        }
      }
      return false;
    },
    jwt: async ({ token, user, account }) => {
      // Store email in token (database lookup will be done in API routes)
      if (user?.email) {
        token.email = user.email;
      }
      return token;
    },
    session: async ({ session, token }) => {
      // Email will be included, userId lookup happens in API routes
      if (session?.user && token?.email) {
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});