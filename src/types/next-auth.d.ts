import { Role } from '@prisma/client';
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: Role;
      studentId?: string | null;
      classRoom?: string | null;
    };
  }
  
  interface User {
    role: Role;
    studentId?: string | null;
    classRoom?: string | null;
  }
}