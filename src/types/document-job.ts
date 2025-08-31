export interface DocumentJobDetails {
  documentAccess: 'pending' | 'completed' | 'failed';
  contentAnalysis: 'pending' | 'completed' | 'failed';
  feedbackGeneration: 'pending' | 'completed' | 'failed';
  documentUpdate: 'pending' | 'completed' | 'failed';
}

export type DocumentJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface DocumentJobData {
  jobId: string;
  status: DocumentJobStatus;
  progress: number;
  currentStep?: string | null;
  totalSteps: number;
  estimatedTimeRemaining: number;
  estimatedTotalTime?: number | null;
  error?: string | null;
  startedAt: string;
  completedAt?: string | null;
  commentsAdded: number;
  stepDetails?: DocumentJobDetails | null;
  documentUrl: string;
  genre: string;
  successMessage?: string | null;
}

export interface DocumentJobResponse {
  jobId: string;
  status: DocumentJobStatus;
  progress: number;
  estimatedTime?: number;
  message: string;
}