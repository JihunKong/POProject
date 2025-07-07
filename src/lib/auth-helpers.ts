import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth';

export async function auth() {
  return await getServerSession(authOptions);
}