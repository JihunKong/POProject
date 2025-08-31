import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { DocumentJobData, DocumentJobResponse } from '@/types/document-job';

export function useDocumentFeedbackStatus(jobId: string | null) {
  const [shouldPoll, setShouldPoll] = useState(true);

  const result = useQuery({
    queryKey: ['documentFeedbackStatus', jobId],
    queryFn: async (): Promise<DocumentJobData> => {
      if (!jobId) throw new Error('No job ID provided');
      
      const response = await axios.get(`/api/docs/feedback/status/${jobId}`);
      return response.data;
    },
    enabled: !!jobId && shouldPoll,
    refetchInterval: shouldPoll ? 3000 : false, // 3초마다 폴링 또는 중단
    staleTime: 0, // 항상 최신 상태 확인
    gcTime: 1000 * 60 * 5, // 5분간 캐시 유지
  });

  // 🔧 완료/실패/타임아웃 조건에서 폴링 중단
  useEffect(() => {
    if (result.data) {
      const data = result.data;
      
      // 완료되거나 실패한 경우 폴링 중단
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        setShouldPoll(false);
        return;
      }
      
      // 20분 이상 경과시 폴링 중단 (타임아웃)
      if (data.startedAt) {
        const elapsed = Date.now() - new Date(data.startedAt).getTime();
        const TWENTY_MINUTES = 20 * 60 * 1000;
        if (elapsed > TWENTY_MINUTES) {
          console.warn(`⚠️ Polling timeout for job ${jobId} after 20 minutes`);
          setShouldPoll(false);
        }
      }
    }
  }, [result.data, jobId]);

  // jobId가 변경되면 다시 폴링 시작
  useEffect(() => {
    if (jobId) {
      setShouldPoll(true);
    }
  }, [jobId]);

  return result;
}

export function useDocumentFeedback() {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: jobStatus, isLoading: isPolling, error: statusError } = useDocumentFeedbackStatus(currentJobId);

  const startFeedback = async (genre: string, docUrl: string): Promise<DocumentJobResponse> => {
    setIsSubmitting(true);
    
    try {
      const response = await axios.post('/api/docs/feedback', {
        genre,
        docUrl
      });
      
      const jobData: DocumentJobResponse = response.data;
      setCurrentJobId(jobData.jobId);
      return jobData;
    } catch (error) {
      setCurrentJobId(null);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetJob = () => {
    setCurrentJobId(null);
  };

  return {
    currentJobId,
    jobStatus,
    isSubmitting,
    isPolling,
    statusError,
    startFeedback,
    resetJob
  };
}