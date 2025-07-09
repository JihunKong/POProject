// 인증 마이그레이션 헬퍼
// 기존 사용자들의 Google 계정 연결 문제를 자동으로 해결

import { prisma } from '@/lib/prisma';

export async function migrateUserAccounts(email: string) {
  try {
    // 이메일로 사용자 찾기
    const user = await prisma.user.findUnique({
      where: { email },
      include: { accounts: true }
    });

    if (!user) {
      console.log(`User not found: ${email}`);
      return null;
    }

    // Google 계정이 이미 연결되어 있는지 확인
    const hasGoogleAccount = user.accounts.some(acc => acc.provider === 'google');
    
    if (hasGoogleAccount) {
      console.log(`User ${email} already has Google account linked`);
      return user;
    }

    console.log(`User ${email} needs Google account linking - will be handled by allowDangerousEmailAccountLinking`);
    return user;
  } catch (error) {
    console.error(`Error checking user ${email}:`, error);
    return null;
  }
}

// 모든 사용자의 상태를 로깅하는 함수
export async function logAllUsersStatus() {
  try {
    const users = await prisma.user.findMany({
      include: {
        accounts: {
          select: {
            provider: true
          }
        }
      }
    });

    const stats = {
      total: users.length,
      withGoogle: 0,
      withoutGoogle: 0,
      domains: {} as Record<string, number>
    };

    users.forEach(user => {
      const hasGoogle = user.accounts.some(acc => acc.provider === 'google');
      if (hasGoogle) {
        stats.withGoogle++;
      } else {
        stats.withoutGoogle++;
      }

      const domain = user.email.split('@')[1];
      stats.domains[domain] = (stats.domains[domain] || 0) + 1;
    });

    console.log('User authentication status:', stats);
    return stats;
  } catch (error) {
    console.error('Error logging user status:', error);
    return null;
  }
}