import { Role } from '@prisma/client';

export interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: Role;
  studentId?: string | null;
  classRoom?: string | null;
}

export interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  messages?: Message[];
}

export interface ChatResponse {
  conversationId: string;
  message: string;
}

export interface TeamData {
  id: string;
  name: string;
  members: number;
  progress: number;
  lastActivity: string;
  status: 'at-risk' | 'needs-attention' | 'on-track';
}