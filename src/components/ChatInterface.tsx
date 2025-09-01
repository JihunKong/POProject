'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback, memo } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentJobData, DocumentJobResponse, DocumentJobStatus, DocumentJobDetails } from '@/types/document-job';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Message, Conversation } from '@/types';
// Socket.IO imports removed - using HTTP only
import { Lightbulb, Waves, Target, Bot, User, Plus, Send, Info, Menu, X, Clock, ChevronRight, MessageSquare, FileText, HelpCircle, CheckCircle, AlertCircle, Loader, Bell } from 'lucide-react';
import { useDocumentFeedback } from '@/hooks/useDocumentFeedback';
import { useNotifications } from '@/lib/notifications';

const queryClient = new QueryClient();

// 학생 친화적 애니메이션을 위한 스타일
const studentFriendlyStyles = `
  .animate-spin-slow {
    animation: spin 3s ease-in-out infinite;
  }
  
  .animate-bounce-gentle {
    animation: bounce-gentle 2s ease-in-out infinite;
  }
  
  .animate-fade-in {
    animation: fadeIn 0.5s ease-out;
  }
  
  .animate-scale-in {
    animation: scaleIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  
  .scale-102 {
    transform: scale(1.02);
  }
  
  .progress-shimmer {
    animation: shimmer 2s ease-in-out infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    50% { transform: rotate(180deg) scale(1.1); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes bounce-gentle {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes scaleIn {
    from { 
      transform: scale(0.8) translateY(20px);
      opacity: 0;
    }
    to { 
      transform: scale(1) translateY(0);
      opacity: 1;
    }
  }
  
  @keyframes shimmer {
    0% { background-position: -200px 0; }
    100% { background-position: 200px 0; }
  }
  
  /* 커스텀 스크롤바 스타일 */
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #cbd5e0;
    border-radius: 4px;
    transition: background 0.2s;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #a0aec0;
  }
  
  /* Firefox 스크롤바 지원 */
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e0 #f1f1f1;
  }
`;

type ChatMode = 'assistant' | 'docs';
type AssistantMode = 'general' | 'coaching';

interface ChatState {
  messages: Message[];
  conversationId: string | null;
}


// 2탭 구조로 변경: 프로젝트 도우미 (코칭 모드 포함), 문서 첨삭

// 문서 첨삭 버튼 및 진행률 표시 컴포넌트
const DocumentFeedbackButton = memo(function DocumentFeedbackButton({
  docUrl,
  docGenre,
  isLoading,
  addMessage,
  setIsLoading,
  setGlobalProcessing,
  setGlobalJobStatus
}: {
  docUrl: string;
  docGenre: string;
  isLoading: boolean;
  addMessage: (message: Message) => void;
  setIsLoading: (loading: boolean) => void;
  setGlobalProcessing?: (processing: boolean) => void;
  setGlobalJobStatus?: (status: DocumentJobData | null) => void;
}) {
  // 즉시 애니메이션 표시를 위한 상태
  const [showProgress, setShowProgress] = useState(false);
  const {
    currentJobId,
    jobStatus,
    isSubmitting,
    statusError,
    startFeedback,
    resetJob
  } = useDocumentFeedback() as {
    currentJobId: string | null;
    jobStatus: DocumentJobData | undefined;
    isSubmitting: boolean;
    statusError: Error | null;
    startFeedback: (genre: string, docUrl: string) => Promise<DocumentJobResponse>;
    resetJob: () => void;
  };

  const {
    permission: notificationPermission,
    requestPermission,
    notifyDocumentCompleted,
    notifyDocumentFailed,
    isSupported: isNotificationSupported
  } = useNotifications();

  // 첨삭 작업 시작
  const handleStartFeedback = async () => {
    if (!docUrl || isSubmitting) return;

    // 즉시 애니메이션 시작
    setShowProgress(true);
    
    // 전역 상태에 즉시 표시
    if (setGlobalProcessing && setGlobalJobStatus) {
      setGlobalProcessing(true);
      setGlobalJobStatus(mockJobStatus);
    }
    
    try {
      console.log('🔍 Starting document feedback process');
      console.log('📝 Document URL:', docUrl, 'Genre:', docGenre);
      
      // 사용자 메시지 추가 - 학생 친화적으로 변경
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: `🎯 ${docGenre} 첨삭을 시작할게요!

✨ **꼼꼼하게 첨삭하겠습니다**  
분량에 따라 최장 10분까지 소요될 수 있습니다.  
창을 닫지 말아주세요.

📝 문서: ${docUrl}`,
        timestamp: new Date()
      };
      addMessage(userMessage);

      // 백그라운드 작업 시작  
      const startTime = Date.now();
      const response = await startFeedback(docGenre, docUrl);
      const responseTime = Date.now() - startTime;
      
      // 작업 시작 성공시 계속 애니메이션 표시
      console.log('✅ Job started, keeping animation visible');
      
      console.log('✅ Document feedback job started successfully');
      console.log('📊 Job ID:', response.jobId);

    } catch (error) {
      console.error('❌ FAILED to start feedback job:', error);
      console.error('🔍 Error type:', typeof error);
      console.error('📊 Error details:', error);
      
      // 학생 친화적 에러 처리
      let errorMessage = '잠시 문제가 생겼어요.';
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string }, status?: number } };
        console.log('🌐 HTTP Status:', axiosError.response?.status);
        
        if (axiosError.response?.status === 504) {
          errorMessage = '서버가 잠시 바빠요. 조금 더 기다려주세요!';
        } else if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        }
      }

      const errorMsg: Message = {
        id: Date.now().toString() + '_error',
        role: 'assistant',
        content: `😊 **잠깐만요!**

${errorMessage}

**이렇게 해보세요:**
✅ 문서 공유 권한을 확인해주세요  
✅ 문서 링크가 정확한지 확인해주세요  
✅ 잠시 후 다시 시도해주세요

💭 궁금한 점이 있으면 선생님께 물어보세요!`,
        timestamp: new Date()
      };
      addMessage(errorMsg);
      
      // 에러 발생시 애니메이션 중지
      setShowProgress(false);
      if (setGlobalProcessing) {
        setGlobalProcessing(false);
      }
    }
  };

  // 완료 메시지 추가 및 브라우저 알림 (한 번만 실행)
  useEffect(() => {
    if (jobStatus?.status === 'COMPLETED' && jobStatus.successMessage) {
      // 완료시 애니메이션 중지
      setShowProgress(false);
      if (setGlobalProcessing) {
        setGlobalProcessing(false);
      }
      const successMessage: Message = {
        id: `completion_${jobStatus.jobId}`,
        role: 'assistant',
        content: jobStatus.successMessage,
        timestamp: new Date()
      };
      addMessage(successMessage);

      // 브라우저 알림 표시
      const documentTitle = jobStatus.documentUrl.split('/').pop() || '문서';
      const docLink = `https://docs.google.com/document/d/${jobStatus.jobId.split('-')[0]}/edit`;
      notifyDocumentCompleted(documentTitle, docLink);
      
      // 완료 메시지 표시 후 자동으로 창 닫기
      setTimeout(() => {
        // 완료 팝업 메시지
        alert('✅ 문서 첨삭이 완료되었습니다!\n\n구글 문서에서 댓글을 확인해보세요.');
        
        // 상태 정리 및 창 닫기
        resetJob();
        setIsLoading(false);
        if (setGlobalProcessing) {
          setGlobalProcessing(false);
        }
      }, 3000); // 3초 후 자동 닫기
    }
  }, [jobStatus?.status, jobStatus?.successMessage, addMessage, resetJob, setIsLoading, jobStatus?.jobId, jobStatus?.documentUrl, notifyDocumentCompleted]);

  // 실패 메시지 추가 및 브라우저 알림
  useEffect(() => {
    if (jobStatus?.status === 'FAILED') {
      // 실패시 애니메이션 중지
      setShowProgress(false);
      if (setGlobalProcessing) {
        setGlobalProcessing(false);
      }
      const errorMessage: Message = {
        id: `error_${jobStatus.jobId}`,
        role: 'assistant',
        content: `😊 **아직 첨삭이 끝나지 않았어요**

잠시 문제가 생겼네요. 글았.. 함께 해결해보아요!

**이렇게 해보세요:**
✅ 문서 공유 권한을 확인해주세요  
✅ 문서 링크가 정확한지 확인해주세요  
✅ 잠시 후 다시 시도해주세요

💭 여전히 문제가 있다면 선생님께 말씀드리세요!`,
        timestamp: new Date()
      };
      addMessage(errorMessage);

      // 브라우저 알림 표시
      const documentTitle = jobStatus.documentUrl.split('/').pop() || '문서';
      notifyDocumentFailed(documentTitle, jobStatus.error || '알 수 없는 오류');
      
      // 실패 후 상태 정리
      setTimeout(() => {
        resetJob();
        setIsLoading(false);
      }, 1000);
    }
  }, [jobStatus?.status, jobStatus?.error, addMessage, resetJob, setIsLoading, jobStatus?.jobId, jobStatus?.documentUrl, notifyDocumentFailed]);

  // 진행 중인지 판단 - 즉시 애니메이션 표시 포함
  const isProcessing = Boolean(
    showProgress || 
    currentJobId || // currentJobId가 있으면 일단 처리중으로 간주
    (jobStatus && (jobStatus.status === 'PENDING' || jobStatus.status === 'PROCESSING'))
  );
  
  // 실제 데이터로 전역 상태 업데이트
  useEffect(() => {
    if (jobStatus && setGlobalJobStatus) {
      setGlobalJobStatus(jobStatus);
    }
  }, [jobStatus, setGlobalJobStatus]);

  // 목업 진행률 상태 (실제 데이터가 없을 때 애니메이션 표시용)
  const mockJobStatus: DocumentJobData = {
    jobId: 'mock-' + Date.now(),
    status: 'PROCESSING',
    progress: showProgress && !jobStatus ? 15 : jobStatus?.progress || 0,
    currentStep: showProgress && !jobStatus ? '문서 읽기 시작' : jobStatus?.currentStep || null,
    totalSteps: 4,
    estimatedTimeRemaining: showProgress && !jobStatus ? 8 : jobStatus?.estimatedTimeRemaining || 5,
    estimatedTotalTime: 10,
    error: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
    commentsAdded: 0,
    stepDetails: {
      documentAccess: showProgress && !jobStatus ? 'pending' : jobStatus?.stepDetails?.documentAccess || 'pending',
      contentAnalysis: 'pending',
      feedbackGeneration: 'pending', 
      documentUpdate: 'pending'
    },
    documentUrl: docUrl,
    genre: docGenre,
    successMessage: null
  };
  
  return (
    <>
      <button
        onClick={handleStartFeedback}
        disabled={!docUrl || isSubmitting || isProcessing}
        className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {isSubmitting ? '🚀 준비 중...' : 
         isProcessing ? '📝 첨삭 중...' : 
         '✨ 첨삭 시작하기'}
      </button>

      {/* 알림 권한 요청 */}
      {isNotificationSupported && notificationPermission === 'default' && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">📱 알림 설정</span>
          </div>
          <p className="text-xs text-yellow-700 mb-2">
            🔔 첨삭이 끝나면 알림을 받을 수 있어요!
          </p>
          <button
            onClick={requestPermission}
            className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200 transition-colors"
          >
            ✨ 알림 받기
          </button>
        </div>
      )}
      
      {/* 전체 화면 프로그레스 오버레이는 최상위에서 표시됨 */}
    </>
  );
});

// 학생 친화적 문서 처리 진행률 표시 컴포넌트  
const DocumentProgressIndicator = memo(function DocumentProgressIndicator({
  jobStatus,
  isFullScreen = false
}: {
  jobStatus: DocumentJobData | null;
  isFullScreen?: boolean;
}) {
  // 초기 진행률을 5%로 설정 (0% 방지)
  const [animatedProgress, setAnimatedProgress] = useState(5);

  // 부드러운 진행률 애니메이션
  useEffect(() => {
    // jobStatus가 없거나 progress가 0이면 최소 5% 표시
    const targetProgress = Math.max(jobStatus?.progress || 5, 5);
    const startProgress = animatedProgress;
    const difference = targetProgress - startProgress;
    const duration = 800; // 800ms 애니메이션
    const steps = 30;
    const increment = difference / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setAnimatedProgress(targetProgress);
        clearInterval(timer);
      } else {
        setAnimatedProgress(startProgress + (increment * currentStep));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [jobStatus?.progress, animatedProgress]);

  const getStepIcon = (stepName: keyof DocumentJobDetails, status?: 'pending' | 'completed' | 'failed') => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return (
          <div className="w-5 h-5 text-blue-500 animate-spin">
            📚
          </div>
        );
    }
  };

  const steps = [
    { key: 'documentAccess' as const, label: '📖 문서 열어보기', desc: '문서 내용을 불러오고 있어요' },
    { key: 'contentAnalysis' as const, label: '🔍 내용 분석하기', desc: '어떤 부분을 개선할지 찾고 있어요' },
    { key: 'feedbackGeneration' as const, label: '✨ 도움되는 조언 만들기', desc: '유용한 피드백을 작성하고 있어요' },
    { key: 'documentUpdate' as const, label: '💬 문서에 의견 달기', desc: '문서에 의견을 예쁘게 달고 있어요' }
  ];

  const getProgressMessage = (progress: number) => {
    if (progress < 20) return "📚 문서를 열심히 읽고 있어요...";
    if (progress < 40) return "🔍 내용을 꼼꼼히 분석 중이에요...";
    if (progress < 60) return "✨ 좋은 아이디어를 찾고 있어요...";
    if (progress < 80) return "📝 도움이 될 피드백을 만들고 있어요...";
    if (progress < 100) return "💬 문서에 의견을 예쁜 언어로 작성 중...";
    return "🎉 다 완료됐어요! 미션 완료!";
  };
  
  // jobStatus가 null인 경우 기본값 사용
  const stepDetails = jobStatus?.stepDetails || {
    documentAccess: 'pending',
    contentAnalysis: 'pending',
    feedbackGeneration: 'pending',
    documentUpdate: 'pending'
  } as DocumentJobDetails;

  const containerClass = isFullScreen 
    ? "p-2 sm:p-3 md:p-4 bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-xl border-2 border-blue-300 shadow-2xl backdrop-blur-lg w-full max-w-[90vw] max-h-[90vh] overflow-hidden flex flex-col"
    : "mt-4 p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 shadow-sm";
    
  const emojiSize = isFullScreen 
    ? "text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl" 
    : "text-3xl sm:text-4xl md:text-5xl lg:text-6xl";
  const percentSize = isFullScreen 
    ? "text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl" 
    : "text-2xl sm:text-3xl md:text-4xl lg:text-5xl";
  
  return (
    <div className={containerClass}>
      {/* 고정 헤더 - 항상 보이도록 */}
      <div className="flex-shrink-0 text-center mb-4 sm:mb-6">
        {/* 큰 퍼센트 숫자와 애니메이션 스피너 */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="relative">
            <div className={`${emojiSize} animate-spin-slow text-blue-500`}>
              📝
            </div>
            <div className="absolute -bottom-3 -right-3 animate-bounce-gentle text-3xl">
              ✨
            </div>
            {isFullScreen && (
              <div className="absolute -top-4 -left-4 animate-bounce text-2xl" style={{animationDelay: '1s'}}>
                🎯
              </div>
            )}
          </div>
          <div className={`${percentSize} font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-lg`}>
            {Math.round(animatedProgress)}%
          </div>
        </div>
        
        {/* 현재 상태 메시지 */}
        <div className={`bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl p-2 sm:p-3 mb-3 sm:mb-4 ${isFullScreen ? 'text-sm sm:text-base' : 'text-base lg:text-lg'}`}>
          <p className={`font-bold text-gray-800 text-center ${isFullScreen ? 'text-sm sm:text-base md:text-lg' : 'text-base lg:text-lg'}`}>
            {getProgressMessage(animatedProgress)}
          </p>
        </div>
        
        {/* 예쁜 진행률 바 */}
        <div className={`relative w-full bg-gray-200 rounded-full overflow-hidden shadow-inner mb-4 ${isFullScreen ? 'h-4 sm:h-6 md:h-8' : 'h-4 sm:h-5'}`}>
          <div 
            className={`${isFullScreen ? 'h-4 sm:h-6 md:h-8' : 'h-4 sm:h-5'} rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-blue-400 via-purple-500 to-pink-400 shadow-lg progress-shimmer`}
            style={{ 
              width: `${animatedProgress}%`,
              backgroundImage: 'linear-gradient(45deg, transparent 25%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 75%, transparent 75%)',
              backgroundSize: isFullScreen ? '20px 20px' : '15px 15px',
              animation: animatedProgress > 0 ? 'shimmer 2s ease-in-out infinite' : 'none',
              boxShadow: animatedProgress > 0 ? '0 0 20px rgba(99, 102, 241, 0.8), inset 0 2px 0 rgba(255,255,255,0.5)' : 'none'
            }}
          >
            {/* 진행률 바 내부 반짝임 효과 */}
            <div className="w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-40 animate-pulse"></div>
          </div>
          {/* 진행 퍼센트 표시 */}
          {animatedProgress > 10 && (
            <div 
              className="absolute top-0 h-full flex items-center transition-all duration-1000"
              style={{ left: `${Math.max(10, animatedProgress - 5)}%` }}
            >
              <span className={`font-bold text-white drop-shadow-lg ${isFullScreen ? 'text-xs sm:text-sm md:text-base lg:text-lg' : 'text-xs'}`}>
                {Math.round(animatedProgress)}%
              </span>
            </div>
          )}
        </div>
        
        {/* 예상 시간 */}
        <div className={`bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-300 ${isFullScreen ? 'p-2 sm:p-3' : 'p-3'}`}>
          <p className={`text-yellow-800 text-center font-bold ${isFullScreen ? 'text-xs sm:text-sm md:text-base' : 'text-sm'}`}>
            ⏰ 약 10분 정도 더 기다려주세요
            {isFullScreen && (
              <span className="block text-xs mt-1 opacity-80">화면을 닫지 말고 잠시만 기다려주세요!</span>
            )}
          </p>
        </div>
      </div>

      {/* 스크롤 가능한 단계별 진행 상황 */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="space-y-3">
          <h4 className={`font-bold text-gray-800 mb-3 text-center ${isFullScreen ? 'text-base' : 'text-lg'}`}>🚀 지금 하고 있는 일</h4>
        {steps.map(({ key, label, desc }) => {
          const stepStatus = stepDetails[key];
          const isActive = jobStatus?.currentStep?.includes(label.replace(/^.{2}\s/, '')) || false;
          return (
            <div key={key} className={`relative p-4 rounded-xl transition-all duration-500 transform ${
              isActive ? 'bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-blue-300 shadow-lg scale-105 animate-bounce-gentle' : 
              stepStatus === 'completed' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200' : 
              'bg-gray-50 border border-gray-200'
            }`}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getStepIcon(key, stepStatus)}
                </div>
                <div className="flex-1">
                  <div className={`font-bold text-sm mb-1 ${
                    stepStatus === 'completed' ? 'text-green-700 line-through' : 
                    stepStatus === 'failed' ? 'text-red-700' : 
                    isActive ? 'text-blue-800' :
                    'text-gray-600'
                  }`}>
                    {label}
                  </div>
                  <div className={`text-xs ${
                    isActive ? 'text-blue-700' : 'text-gray-500'
                  }`}>
                    {desc}
                  </div>
                </div>
                {isActive && (
                  <div className="absolute -top-1 -right-1">
                    <div className="animate-bounce text-lg">✨</div>
                  </div>
                )}
                {stepStatus === 'completed' && (
                  <div className="absolute -top-1 -right-1">
                    <div className="text-lg">🎉</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>
      
      {/* 고정 푸터 - 격려 메시지 */}
      <div className="flex-shrink-0 mt-3 sm:mt-4 p-3 sm:p-4 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 rounded-xl border-2 border-pink-200 shadow-md">
        <div className="text-center">
          <div className={`mb-1 animate-bounce-gentle ${isFullScreen ? 'text-2xl' : 'text-3xl'}`}>🌟</div>
          <p className={`font-bold text-purple-800 mb-1 ${isFullScreen ? 'text-sm' : 'text-lg'}`}>
            열심히 작업 중이에요!
          </p>
          <p className={`text-purple-700 ${isFullScreen ? 'text-xs' : 'text-sm'}`}>
            조금만 기다려주세요. 완료되면 알림을 보내드릴게요! 🔔
          </p>
          <div className="mt-2 flex justify-center items-center gap-1">
            <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>
      </div>
    </div>
  );
});

const AssistantTab = memo(function AssistantTab({ 
  messages, 
  isLoading, 
  onSuggestionClick,
  mode,
  setMode,
  streamingMessage,
  isStreaming
}: {
  messages: Message[];
  isLoading: boolean;
  onSuggestionClick: (suggestion: string) => void;
  mode: AssistantMode;
  setMode: (mode: AssistantMode) => void;
  streamingMessage?: string;
  isStreaming?: boolean;
}) {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center w-full max-w-4xl px-4">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-xl">
            <HelpCircle className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
            프로젝트 도우미입니다. 무엇이든 물어보세요!
          </h3>
          <p className="text-gray-600 mb-8 text-lg">
            {mode === 'coaching' ? 'GROW 모델 기반 학습 코칭을 도와드립니다' : '프로젝트 관련 모든 질문에 답해드립니다'}
          </p>
          
          {/* 모드 선택 토글 */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setMode('general')}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'general' 
                    ? 'bg-blue-500 text-white shadow-md' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                일반 도움
              </button>
              <button
                onClick={() => setMode('coaching')}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'coaching' 
                    ? 'bg-blue-500 text-white shadow-md' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                GROW 코칭
              </button>
            </div>
          </div>
          
          {mode === 'general' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 justify-center">
                <button
                  onClick={() => onSuggestionClick("설문조사 항목을 만들어주세요")}
                  className="group bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 text-left border-2 border-transparent hover:border-blue-200"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <MessageSquare className="w-6 h-6 text-blue-600" />
                    </div>
                    <h4 className="font-bold text-gray-800">설문 도움</h4>
                  </div>
                  <p className="text-sm text-gray-600">설문조사 항목을 만들어주세요</p>
                </button>

                <button
                  onClick={() => onSuggestionClick("SDGs와 연결된 프로젝트 아이디어를 제안해주세요")}
                  className="group bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 text-left border-2 border-transparent hover:border-green-200"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                      <Lightbulb className="w-6 h-6 text-green-600" />
                    </div>
                    <h4 className="font-bold text-gray-800">SDGs 연계</h4>
                  </div>
                  <p className="text-sm text-gray-600">SDGs와 연결된 프로젝트 아이디어를 제안해주세요</p>
                </button>

                <button
                  onClick={() => onSuggestionClick("프로젝트 일정표를 만들어주세요")}
                  className="group bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 text-left border-2 border-transparent hover:border-purple-200"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                      <Clock className="w-6 h-6 text-purple-600" />
                    </div>
                    <h4 className="font-bold text-gray-800">일정 계획</h4>
                  </div>
                  <p className="text-sm text-gray-600">프로젝트 일정표를 만들어주세요</p>
                </button>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
                <Info className="w-4 h-4 inline mr-2" />
                Pure Ocean 프로젝트 자료를 기반으로 답변해드립니다
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 justify-center">
                <button
                  onClick={() => onSuggestionClick("우리 지역 해양 문제를 조사하고 싶어요")}
                  className="group bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 text-left border-2 border-transparent hover:border-blue-200"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <Target className="w-6 h-6 text-blue-600" />
                    </div>
                    <h4 className="font-bold text-gray-800">목표 설정</h4>
                  </div>
                  <p className="text-sm text-gray-600">우리 지역 해양 문제를 조사하고 싶어요</p>
                </button>

                <button
                  onClick={() => onSuggestionClick("해양 플라스틱 문제를 해결하는 프로젝트를 하고 싶어요")}
                  className="group bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 text-left border-2 border-transparent hover:border-green-200"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                      <Lightbulb className="w-6 h-6 text-green-600" />
                    </div>
                    <h4 className="font-bold text-gray-800">아이디어 탐색</h4>
                  </div>
                  <p className="text-sm text-gray-600">해양 플라스틱 문제를 해결하는 프로젝트를 하고 싶어요</p>
                </button>

                <button
                  onClick={() => onSuggestionClick("팀원들과 역할 분담을 어떻게 하면 좋을까요?")}
                  className="group bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 text-left border-2 border-transparent hover:border-purple-200"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                      <User className="w-6 h-6 text-purple-600" />
                    </div>
                    <h4 className="font-bold text-gray-800">팀 협업</h4>
                  </div>
                  <p className="text-sm text-gray-600">팀원들과 역할 분담을 어떻게 하면 좋을까요?</p>
                </button>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
                <Info className="w-4 h-4 inline mr-2" />
                GROW 모델(목표-현실-대안-실행)을 기반으로 한 단계씩 질문드릴게요
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {messages.map((message, index) => (
        <div
          key={`assistant-${index}`}
          className={`flex gap-3 ${
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          {message.role === 'assistant' && (
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-md">
                <Bot className="w-6 h-6 text-white" />
              </div>
            </div>
          )}
          
          <div className={`max-w-2xl ${message.role === 'user' ? 'order-1' : 'order-2'}`}>
            <div className={`rounded-2xl px-6 py-4 shadow-sm ${
              message.role === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-white border border-gray-200'
            }`}>
              <div className={`whitespace-pre-wrap ${
                message.role === 'user' ? 'text-white' : 'text-gray-800'
              }`}>
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2">
                    <ReactMarkdown
                      components={{
                        a: ({ ...props }) => (
                          <a 
                            {...props} 
                            className={`underline hover:no-underline ${
                              message.role === 'user' 
                                ? 'text-blue-100 hover:text-white' 
                                : 'text-blue-600 hover:text-blue-800'
                            }`}
                            target="_blank" 
                            rel="noopener noreferrer"
                          />
                        ),
                        strong: ({ ...props }) => (
                          <strong {...props} className="font-bold" />
                        ),
                        p: ({ ...props }) => (
                          <p {...props} className="mb-2 last:mb-0" />
                        ),
                        ul: ({ ...props }) => (
                          <ul {...props} className="list-disc list-inside mb-2" />
                        ),
                        ol: ({ ...props }) => (
                          <ol {...props} className="list-decimal list-inside mb-2" />
                        ),
                        li: ({ ...props }) => (
                          <li {...props} className="mb-1" />
                        )
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  message.content
                )}
              </div>
              {message.timestamp && (
                <div className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                }`}>
                  {message.timestamp.toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
            </div>
          </div>

          {message.role === 'user' && (
            <div className="flex-shrink-0 order-2">
              <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-md">
              <Bot className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl px-6 py-4 shadow-sm">
            <div className="loading-wave text-gray-400">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}

      {/* 스트리밍 메시지 표시 */}
      {isStreaming && streamingMessage && (
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-md">
              <Bot className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="max-w-2xl">
            <div className="rounded-2xl px-6 py-4 shadow-sm bg-white border border-gray-200">
              <div className="whitespace-pre-wrap text-gray-800">
                <div className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2">
                  <ReactMarkdown
                    components={{
                      a: ({ ...props }) => (
                        <a 
                          {...props} 
                          className="underline hover:no-underline text-blue-600 hover:text-blue-800"
                          target="_blank" 
                          rel="noopener noreferrer"
                        />
                      ),
                      strong: ({ ...props }) => (
                        <strong {...props} className="font-bold" />
                      ),
                      p: ({ ...props }) => (
                        <p {...props} className="mb-2 last:mb-0" />
                      ),
                      ul: ({ ...props }) => (
                        <ul {...props} className="list-disc list-inside mb-2" />
                      ),
                      ol: ({ ...props }) => (
                        <ol {...props} className="list-decimal list-inside mb-2" />
                      ),
                      li: ({ ...props }) => (
                        <li {...props} className="mb-1" />
                      )
                    }}
                  >
                    {streamingMessage}
                  </ReactMarkdown>
                  {/* 타이핑 인디케이터 */}
                  <span className="inline-block w-2 h-5 bg-gray-400 ml-1 animate-pulse"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// 단일 컴포넌트로 모든 탭 렌더링 처리 - 내부 조건부 렌더링으로 탭 전환

const DocsTab = memo(function DocsTab({ 
  messages, 
  isLoading, 
  docUrl,
  setDocUrl,
  docGenre,
  setDocGenre,
  addMessage,
  setIsLoading,
  streamingMessage,
  isStreaming,
  setGlobalProcessing,
  setGlobalJobStatus
}: {
  messages: Message[];
  isLoading: boolean;
  docUrl: string;
  setDocUrl: (url: string) => void;
  docGenre: string;
  setDocGenre: (genre: string) => void;
  addMessage: (message: Message) => void;
  setIsLoading: (loading: boolean) => void;
  streamingMessage?: string;
  isStreaming?: boolean;
  setGlobalProcessing?: (processing: boolean) => void;
  setGlobalJobStatus?: (status: DocumentJobData | null) => void;
}) {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center w-full max-w-4xl px-4">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl">
            <FileText className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
            Pure Ocean 워크시트 첨삭
          </h3>
          <p className="text-gray-600 mb-8 text-lg">
            작성한 Pure Ocean 프로젝트 워크시트를 공유하면 AI가 자세한 피드백을 드립니다
          </p>
          
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
              <h4 className="font-bold text-gray-800 mb-4">워크시트 정보 입력</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pure Ocean 워크시트 Google Docs URL
                  </label>
                  <input
                    type="text"
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    placeholder="https://docs.google.com/document/d/.../edit"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    작성 중인 문서들을 첨부해주세요.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    첨삭 유형
                  </label>
                  <select
                    value={docGenre}
                    onChange={(e) => setDocGenre(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="워크시트">프로젝트 워크시트</option>
                    <option value="보고서">최종 보고서</option>
                    <option value="발표자료">PPT 발표자료</option>
                  </select>
                </div>
                
                <DocumentFeedbackButton
                  docUrl={docUrl}
                  docGenre={docGenre}
                  isLoading={isLoading}
                  addMessage={addMessage}
                  setIsLoading={setIsLoading}
                  setGlobalProcessing={setGlobalProcessing}
                  setGlobalJobStatus={setGlobalJobStatus}
                />
              </div>
            </div>
            
            <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-800">
              <Info className="w-4 h-4 inline mr-2" />
              Pure Ocean 프로젝트 평가 기준에 따라 각 섹션별로 구체적인 피드백을 제공합니다
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {messages.map((message, index) => (
        <div
          key={`docs-${index}`}
          className={`flex gap-3 ${
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          {message.role === 'assistant' && (
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-md">
                <Bot className="w-6 h-6 text-white" />
              </div>
            </div>
          )}
          
          <div className={`max-w-2xl ${message.role === 'user' ? 'order-1' : 'order-2'}`}>
            <div className={`rounded-2xl px-6 py-4 shadow-sm ${
              message.role === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-white border border-gray-200'
            }`}>
              <div className={`whitespace-pre-wrap ${
                message.role === 'user' ? 'text-white' : 'text-gray-800'
              }`}>
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2">
                    <ReactMarkdown
                      components={{
                        a: ({ ...props }) => (
                          <a 
                            {...props} 
                            className={`underline hover:no-underline ${
                              message.role === 'user' 
                                ? 'text-blue-100 hover:text-white' 
                                : 'text-blue-600 hover:text-blue-800'
                            }`}
                            target="_blank" 
                            rel="noopener noreferrer"
                          />
                        ),
                        strong: ({ ...props }) => (
                          <strong {...props} className="font-bold" />
                        ),
                        p: ({ ...props }) => (
                          <p {...props} className="mb-2 last:mb-0" />
                        ),
                        ul: ({ ...props }) => (
                          <ul {...props} className="list-disc list-inside mb-2" />
                        ),
                        ol: ({ ...props }) => (
                          <ol {...props} className="list-decimal list-inside mb-2" />
                        ),
                        li: ({ ...props }) => (
                          <li {...props} className="mb-1" />
                        )
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  message.content
                )}
              </div>
              {message.timestamp && (
                <div className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                }`}>
                  {message.timestamp.toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
            </div>
          </div>

          {message.role === 'user' && (
            <div className="flex-shrink-0 order-2">
              <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-md">
              <Bot className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl px-6 py-4 shadow-sm">
            <div className="loading-wave text-gray-400">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}

      {/* 스트리밍 메시지 표시 - DocsTab */}
      {isStreaming && streamingMessage && (
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-md">
              <Bot className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="max-w-2xl">
            <div className="rounded-2xl px-6 py-4 shadow-sm bg-white border border-gray-200">
              <div className="whitespace-pre-wrap text-gray-800">
                <div className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2">
                  <ReactMarkdown
                    components={{
                      a: ({ ...props }) => (
                        <a 
                          {...props} 
                          className="underline hover:no-underline text-blue-600 hover:text-blue-800"
                          target="_blank" 
                          rel="noopener noreferrer"
                        />
                      ),
                      strong: ({ ...props }) => (
                        <strong {...props} className="font-bold" />
                      ),
                      p: ({ ...props }) => (
                        <p {...props} className="mb-2 last:mb-0" />
                      ),
                      ul: ({ ...props }) => (
                        <ul {...props} className="list-disc list-inside mb-2" />
                      ),
                      ol: ({ ...props }) => (
                        <ol {...props} className="list-decimal list-inside mb-2" />
                      ),
                      li: ({ ...props }) => (
                        <li {...props} className="mb-1" />
                      )
                    }}
                  >
                    {streamingMessage}
                  </ReactMarkdown>
                  {/* 타이핑 인디케이터 */}
                  <span className="inline-block w-2 h-5 bg-gray-400 ml-1 animate-pulse"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

function ChatInterfaceContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  
  // 전체 화면 문서 진행률 표시 상태
  const [globalProcessing, setGlobalProcessing] = useState(false);
  const [globalJobStatus, setGlobalJobStatus] = useState<DocumentJobData | null>(null);
  
  // 2탭 구조 상태 관리 (코칭은 서브모드로)
  const [chatStates, setChatStates] = useState<Record<ChatMode, ChatState>>({
    assistant: { messages: [], conversationId: null },
    docs: { messages: [], conversationId: null }
  });
  
  // 프로젝트 도우미의 서브모드 (일반/코칭)
  const [assistantMode, setAssistantMode] = useState<AssistantMode>('general');
  
  // 탭 전환 강제 리렌더링을 위한 상태 (중복 제거됨)
  
  const [input, setInput] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  
  // 스트리밍 관련 상태
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  
  // URL 파라미터에서 초기 chatMode 설정
  const initialChatMode = searchParams.get('mode') as ChatMode || 'assistant';
  const [chatMode, setChatMode] = useState<ChatMode>(initialChatMode);
  
  
  // 직접 상태 접근 (useMemo 제거하여 캐싱 이슈 방지)
  const currentMessages = chatStates[chatMode].messages;
  const currentConversationId = chatStates[chatMode].conversationId;
  
  console.log(`🔄 Tab: ${chatMode}, Messages count: ${currentMessages.length}, ConversationId: ${currentConversationId}`);
  
  // React StrictMode 호환성을 위한 탭 전환 감지
  useEffect(() => {
    console.log(`🔄 ChatMode changed to: ${chatMode}`);
  }, [chatMode]);

  // 동기적 UI 업데이트 보장
  useLayoutEffect(() => {
    console.log(`🔧 Layout effect - ensuring DOM update for ${chatMode}`);
  }, [chatMode]);
  
  // 코칭 모드 전환 시 메시지 초기화 (stateless 구현)
  useEffect(() => {
    if (chatMode === 'assistant' && assistantMode === 'coaching') {
      // 코칭 모드로 전환하면 이전 대화 초기화
      setChatStates(prev => ({
        ...prev,
        [chatMode]: { 
          messages: [], 
          conversationId: null 
        }
      }));
      console.log('🧹 Coaching mode activated: messages cleared (stateless)');
    }
  }, [assistantMode, chatMode]);
  
  const [docUrl, setDocUrl] = useState('');
  const [docGenre, setDocGenre] = useState('워크시트');
  
  // 탭별 독립적인 ref 시스템으로 DOM 충돌 방지
  const messagesContainerRefs = useRef<Record<ChatMode, HTMLDivElement | null>>({
    assistant: null,
    docs: null
  });
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 안정화된 ref 콜백 - 무한 재설정 방지
  const setMessagesContainerRef = useCallback((el: HTMLDivElement | null) => {
    console.log(`🔧 Setting ref for ${chatMode}:`, el ? 'Element' : 'null');
    messagesContainerRefs.current[chatMode] = el;
  }, [chatMode]);

  // 현재 탭별 독립적 스크롤 - DOM 참조 충돌 완전 방지
  const scrollToBottom = useCallback((force = false, targetMode?: ChatMode) => {
    const mode = targetMode || chatMode;
    console.log(`📜 Scroll request for mode: ${mode}, force: ${force}`);
    
    if (!isUserScrolling || force) {
      const container = messagesContainerRefs.current[mode];
      console.log(`📜 Container for ${mode}:`, container ? 'Found' : 'NULL');
      
      if (container) {
        // 즉시 실행으로 타이밍 이슈 제거
        requestAnimationFrame(() => {
          // 한 번 더 검증하여 탭 전환 시 잘못된 참조 방지
          if (messagesContainerRefs.current[mode] === container) {
            console.log(`📜 Scrolling ${mode} to bottom`);
            container.scrollTo({
              top: container.scrollHeight,
              behavior: 'smooth'
            });
          } else {
            console.log(`⚠️ Reference changed for ${mode}, skipping scroll`);
          }
        });
      }
    } else {
      console.log(`📜 User scrolling, skipping auto-scroll for ${mode}`);
    }
  }, [isUserScrolling, chatMode]);

  // Auto scroll only when new messages arrive and user is not scrolling
  useEffect(() => {
    // Only auto-scroll for new messages (not initial load)
    if (currentMessages.length > 0) {
      scrollToBottom();
    }
  }, [currentMessages.length, scrollToBottom]);

  // 현재 탭별 독립적 스크롤 감지 - 탭 전환 시 이벤트 리스너 충돌 방지
  useEffect(() => {
    const container = messagesContainerRefs.current[chatMode];
    if (!container) return;

    const handleScroll = () => {
      // 현재 활성 탭의 컨테이너인지 재검증
      if (messagesContainerRefs.current[chatMode] === container) {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
        setIsUserScrolling(!isAtBottom);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      // 탭 전환 시 스크롤 상태 초기화
      setIsUserScrolling(false);
    };
  }, [chatMode]); // chatMode 변경 시마다 새로운 리스너 등록

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [input]);

  // 현재 탭의 상태 업데이트 헬퍼 함수 (useCallback으로 안정화)
  // 현재 탭 상태 업데이트
  const updateCurrentTabState = useCallback((updates: Partial<ChatState>) => {
    setChatStates(prev => ({
      ...prev,
      [chatMode]: { ...prev[chatMode], ...updates }
    }));
  }, [chatMode]);

  const addMessage = useCallback((message: Message) => {
    updateCurrentTabState({
      messages: [...currentMessages, message]
    });
  }, [updateCurrentTabState, currentMessages]);

  // 특정 탭 상태 업데이트 (탭 전환용)
  const updateTabState = useCallback((tab: ChatMode, updates: Partial<ChatState>) => {
    setChatStates(prev => ({
      ...prev,
      [tab]: { ...prev[tab], ...updates }
    }));
  }, []);

  // 대화 불러오기 (대화 유형 감지하여 적절한 탭으로 자동 전환)
  const loadConversation = async (convId: string) => {
    setIsLoadingMessages(true);
    setShowHistory(false);
    setShowMobileMenu(false);
    try {
      const response = await axios.get(`/api/chat/${convId}`);
      const loadedMessages = response.data.messages.map((msg: Message & { timestamp: string }) => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
      }));
      
      // 대화 내용 분석하여 적절한 탭 결정
      const conversationType = analyzeConversationType(loadedMessages);
      const targetTab: ChatMode = conversationType === 'docs' ? 'docs' : 'assistant';
      
      console.log(`📁 Loading conversation ${convId} to ${targetTab} tab`);
      
      // 대화가 속한 탭으로 전환
      if (targetTab !== chatMode) {
        setChatMode(targetTab);
      }
      
      // 해당 탭에 대화 로드
      updateTabState(targetTab, { messages: loadedMessages, conversationId: convId });
      
      // Don't auto-scroll when loading conversation
      setIsUserScrolling(true);
      // Allow user to manually scroll after loading
      setTimeout(() => setIsUserScrolling(false), 1000);
    } catch (error) {
      console.error('Failed to load conversation:', error);
      alert('대화를 불러오는데 실패했습니다.');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // 대화 유형 분석 (문서 첨삭인지 일반 대화인지 판단)
  const analyzeConversationType = (messages: Message[]): 'assistant' | 'docs' => {
    const docKeywords = ['첨삭', '워크시트', 'docs.google.com', '문서', '보고서', 'PPT'];
    const conversationText = messages.map(m => m.content).join(' ').toLowerCase();
    
    const hasDocKeywords = docKeywords.some(keyword => 
      conversationText.includes(keyword.toLowerCase())
    );
    
    return hasDocKeywords ? 'docs' : 'assistant';
  };

  const { data: conversationsData, refetch: refetchConversations, isLoading: isLoadingConversations, error: conversationsError } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      console.log('Fetching conversations...');
      const response = await axios.get('/api/chat');
      console.log('Conversations response:', response.data);
      return response.data.conversations as Conversation[];
    },
    enabled: !!session,
  });

  // Using HTTP-only approach


  // HTTP 스트리밍 기반 메시지 처리 (WebSocket 대체)
  const handleHttpMessage = useCallback(async (message: string) => {
    console.log('🌐 Using HTTP streaming for message:', { message, chatMode, assistantMode });
    
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    
    updateCurrentTabState({
      messages: [...currentMessages, userMessage]
    });
    scrollToBottom(true, chatMode);

    // 스트리밍 시작
    setIsStreaming(true);
    setStreamingMessage('');

    // HTTP 스트리밍 API 호출
    const endpoint = '/api/chat/stream';
    const payload = {
      conversationId: (chatMode === 'assistant' && assistantMode === 'coaching') ? null : currentConversationId,
      message,
      assistantMode,
    };

    try {
      console.log('🔄 Starting HTTP streaming:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body stream');
      }

      const decoder = new TextDecoder();
      let fullMessage = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);
              if (jsonStr.trim() === '[DONE]') continue;

              try {
                const data = JSON.parse(jsonStr);
                
                switch (data.type) {
                  case 'chunk':
                    if (data.content) {
                      fullMessage += data.content;
                      setStreamingMessage(prev => prev + data.content);
                      scrollToBottom(true, chatMode);
                    }
                    break;
                    
                  case 'complete':
                    console.log('✅ HTTP streaming complete:', fullMessage);
                    
                    // 최종 메시지 저장
                    const assistantMessage: Message = {
                      role: 'assistant',
                      content: data.fullMessage || fullMessage,
                      timestamp: new Date(),
                    };
                    
                    updateCurrentTabState({
                      conversationId: (chatMode === 'assistant' && assistantMode === 'coaching') ? null : data.conversationId,
                      messages: [...currentMessages, userMessage, assistantMessage]
                    });
                    
                    if (!(chatMode === 'assistant' && assistantMode === 'coaching')) {
                      refetchConversations();
                    }
                    
                    setStreamingMessage('');
                    setIsStreaming(false);
                    scrollToBottom(true, chatMode);
                    return;
                    
                  case 'error':
                    throw new Error(data.error || 'Unknown streaming error');
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      console.error('❌ HTTP streaming failed:', error);
      setIsStreaming(false);
      setStreamingMessage('');
      
      const errorMessage: Message = {
        role: 'assistant',
        content: `죄송합니다. 서버와의 연결에 문제가 발생했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      
      updateCurrentTabState({
        messages: [...currentMessages, userMessage, errorMessage]
      });
      
      scrollToBottom(true, chatMode);
    }
  }, [chatMode, assistantMode, currentConversationId, currentMessages, updateCurrentTabState, scrollToBottom, refetchConversations]);

  // Removed WebSocket handler - using HTTP only

  // HTTP-only message sending
  const handleStreamingMessage = useCallback(async (message: string) => {
    console.log('🌐 Using HTTP streaming for message:', { 
      message: message.substring(0, 50) + '...',
      chatMode, 
      assistantMode
    });
    
    return handleHttpMessage(message);
  }, [chatMode, assistantMode, handleHttpMessage]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const messageToSend = input;
    setInput('');
    
    // 스트리밍 메시지 처리
    await handleStreamingMessage(messageToSend);
  };

  const startNewConversation = () => {
    updateCurrentTabState({ 
      conversationId: null, 
      messages: [] 
    });
    setChatMode('assistant');  // 새 대화 시작 시 프로젝트 도우미 탭으로 자동 전환
    setShowHistory(false);
    setShowMobileMenu(false);
  };

  const handleSuggestionClick = async (suggestion: string) => {
    // HTTP 스트리밍 사용
    await handleStreamingMessage(suggestion);
  };

  return (
    <div className="flex h-full w-full bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* 전체 화면 문서 진행률 오버레이 */}
      {globalProcessing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-fade-in">
          <div className="w-[90vw] max-w-md mx-2 animate-scale-in">
            <DocumentProgressIndicator 
              jobStatus={globalJobStatus || {
                // 기본 상태 객체 - jobStatus가 없을 때 사용
                jobId: 'temp',
                status: 'PROCESSING' as const,
                progress: 5,
                currentStep: '문서 처리 준비 중',
                totalSteps: 4,
                estimatedTimeRemaining: 10,
                estimatedTotalTime: 10,
                startedAt: new Date().toISOString(),
                documentUrl: '',
                genre: '',
                stepDetails: {
                  documentAccess: 'pending' as const,
                  contentAnalysis: 'pending' as const,
                  feedbackGeneration: 'pending' as const,
                  documentUpdate: 'pending' as const,
                },
                commentsAdded: 0
              }} 
              isFullScreen={true}
            />
          </div>
        </div>
      )}

      {/* Mobile Menu Button */}
      <button
        onClick={() => setShowMobileMenu(!showMobileMenu)}
        className="lg:hidden fixed top-20 left-4 z-40 p-2 bg-white rounded-xl shadow-lg"
      >
        {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* History Sidebar - Only show in Assistant tab */}
      {chatMode === 'assistant' && (
        <>
          {/* Mobile Overlay */}
          {showMobileMenu && (
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowMobileMenu(false)}
            />
          )}

          {/* History Sidebar - Right Side */}
          <div className={`
            fixed lg:absolute
            ${showMobileMenu ? 'right-0' : '-right-full'}
            ${showHistory ? 'lg:right-0' : 'lg:-right-80'}
            top-24 lg:top-32 h-[calc(100%-6rem)] lg:h-[calc(100%-8rem)] w-80 bg-white shadow-xl
            transition-all duration-300 ease-in-out z-40
            overflow-hidden border-l border-gray-200 rounded-l-xl
          `}>
        <div className="w-80 flex flex-col h-full">
          {/* 고정 헤더 */}
          <div className="flex-shrink-0 p-6 border-b border-gray-200 bg-white rounded-tl-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800">대화 기록</h3>
              <button
                onClick={() => {
                  setShowHistory(false);
                  setShowMobileMenu(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <button
              onClick={startNewConversation}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 hover:scale-102 transition-transform"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">새 대화 시작</span>
            </button>
          </div>

          {/* 스크롤 가능한 대화 목록 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {isLoadingConversations ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">대화 기록 로딩 중...</p>
              </div>
            ) : conversationsError ? (
              <div className="text-center py-4">
                <p className="text-sm text-red-500">대화 기록을 불러오는데 실패했습니다.</p>
                <button 
                  onClick={() => refetchConversations()}
                  className="text-xs text-blue-600 hover:underline mt-1"
                >
                  다시 시도
                </button>
              </div>
            ) : conversationsData && conversationsData.length > 0 ? (
              conversationsData.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                    currentConversationId === conv.id 
                      ? 'bg-blue-50 border-2 border-blue-300' 
                      : 'hover:bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  <div className="font-medium text-gray-800 mb-1">{conv.title}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {new Date(conv.updatedAt).toLocaleDateString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">아직 대화 기록이 없습니다.</p>
                <p className="text-xs text-gray-400 mt-1">새 대화를 시작해보세요!</p>
              </div>
            )}
          </div>
        </div>
      </div>
        </>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full w-full">
        {/* 디버깅 정보 (개발 환경에서만 표시) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-2 text-xs">
            <strong>Debug:</strong> Mode={chatMode}, Messages={currentMessages.length}
          </div>
        )}

        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm shadow-sm">
          <div className="px-4 md:px-6 py-4">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-md">
                    <Waves className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-gray-800">Pure Ocean AI 코치</h2>
                    <p className="text-xs md:text-sm text-gray-600">
                      {chatMode === 'assistant' && (assistantMode === 'coaching' ? 'GROW 모델 기반 학습 코칭' : '프로젝트 도우미')}
                      {chatMode === 'docs' && '문서 첨삭 도우미'}
                    </p>
                  </div>
                </div>
              </div>

              {/* WebSocket status display removed - using HTTP only */}
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="border-t border-gray-200">
            <div className="max-w-6xl mx-auto px-4 md:px-6">
              <div className="flex items-center justify-between">
                <div className="flex space-x-1">
                  <button
                    onClick={() => setChatMode('assistant')}
                    className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors ${
                      chatMode === 'assistant'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4" />
                    프로젝트 도우미
                  </button>
                  <button
                    onClick={() => setChatMode('docs')}
                    className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors ${
                      chatMode === 'docs'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    문서 첨삭
                  </button>
                </div>
                
                {/* 대화 기록 버튼을 탭 영역으로 이동 */}
                {chatMode === 'assistant' && (
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors ${
                      showHistory
                        ? 'text-blue-600 bg-blue-50 border border-blue-200 rounded-lg'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    대화 기록
                    {showHistory ? (
                      <X className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4 rotate-180" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div 
          ref={setMessagesContainerRef}
          className="flex-1 overflow-y-auto flex"
        >
          <div className="w-full max-w-5xl mx-auto p-4 md:p-6">
            {isLoadingMessages ? (
              <div className="flex justify-center items-center h-full">
                <div className="text-center">
                  <div className="loading-wave text-blue-500 mb-4">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <p className="text-gray-600 font-medium">대화를 불러오는 중...</p>
                </div>
              </div>
            ) : (
              <TabContainer
                key={chatMode}
                chatMode={chatMode}
                messages={currentMessages}
                isLoading={isStreaming}
                onSuggestionClick={handleSuggestionClick}
                docUrl={docUrl}
                setDocUrl={setDocUrl}
                docGenre={docGenre}
                setDocGenre={setDocGenre}
                assistantMode={assistantMode}
                setAssistantMode={setAssistantMode}
                streamingMessage={streamingMessage}
                isStreaming={isStreaming}
                addMessage={addMessage}
                setIsStreaming={setIsStreaming}
                setGlobalProcessing={setGlobalProcessing}
                setGlobalJobStatus={setGlobalJobStatus}
              />
            )}
          </div>
        </div>

        {/* Input Area - 문서 첨삭에서 후속 질문 허용 */}
        {(chatMode === 'assistant' || (chatMode === 'docs' && currentMessages.length > 0)) && (
          <div className="bg-white border-t border-gray-200 p-4">
            <form onSubmit={handleSubmit} className="max-w-5xl mx-auto">
              <div className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder={chatMode === 'docs' ? "첨삭 결과에 대해 추가 질문하세요..." : "궁금한 점을 물어보세요..."}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           resize-none min-h-[52px] max-h-32"
                  rows={1}
                />
                <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                  Shift + Enter로 줄바꿈
                </div>
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className="btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center gap-2"
                title="HTTP로 메시지 전송"
              >
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline">전송</span>
                
                {/* 전송 모드 표시 */}
                {chatMode === 'assistant' && (
                  <span className="hidden md:inline text-xs opacity-70">
                    🌐
                  </span>
                )}
              </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// 독립적인 탭 컨테이너 - 확실한 DOM 교체 보장
const TabContainer = memo(function TabContainer({
  chatMode,
  messages,
  isLoading,
  onSuggestionClick,
  docUrl,
  setDocUrl,
  docGenre,
  setDocGenre,
  assistantMode,
  setAssistantMode,
  streamingMessage,
  isStreaming,
  addMessage,
  setIsStreaming,
  setGlobalProcessing,
  setGlobalJobStatus
}: {
  chatMode: ChatMode;
  messages: Message[];
  isLoading: boolean;
  onSuggestionClick: (suggestion: string) => void;
  docUrl: string;
  setDocUrl: (url: string) => void;
  docGenre: string;
  setDocGenre: (genre: string) => void;
  assistantMode: AssistantMode;
  setAssistantMode: (mode: AssistantMode) => void;
  streamingMessage: string;
  isStreaming: boolean;
  addMessage: (message: Message) => void;
  setIsStreaming: (loading: boolean) => void;
  setGlobalProcessing: (processing: boolean) => void;
  setGlobalJobStatus: (status: DocumentJobData | null) => void;
}) {
  // 탭 변경 시에만 DOM 정리
  useLayoutEffect(() => {
    console.log(`🔄 TabContainer: Switched to ${chatMode}`);
  }, [chatMode]);

  // chatMode 변경 감지 (로깅 최소화)
  useEffect(() => {
    console.log(`🎯 TabContainer: Switched to ${chatMode}`);
  }, [chatMode]);

  return (
    <div className="w-full h-full">
      {chatMode === 'assistant' && (
        <div key="assistant-tab-container" className="w-full h-full">
          <AssistantTab
            messages={messages}
            isLoading={isLoading}
            onSuggestionClick={onSuggestionClick}
            mode={assistantMode}
            setMode={setAssistantMode}
            streamingMessage={streamingMessage}
            isStreaming={isStreaming}
          />
        </div>
      )}
      {chatMode === 'docs' && (
        <div key="docs-tab-container" className="w-full h-full">
          <DocsTab
            messages={messages}
            isLoading={isStreaming}
            docUrl={docUrl}
            setDocUrl={setDocUrl}
            docGenre={docGenre}
            setDocGenre={setDocGenre}
            addMessage={addMessage}
            setIsLoading={setIsStreaming}
            streamingMessage={streamingMessage}
            isStreaming={isStreaming}
            setGlobalProcessing={setGlobalProcessing}
            setGlobalJobStatus={setGlobalJobStatus}
          />
        </div>
      )}
    </div>
  );
});

export default function ChatInterface() {
  return (
    <QueryClientProvider client={queryClient}>
      <style dangerouslySetInnerHTML={{ __html: studentFriendlyStyles }} />
      <ChatInterfaceContent />
    </QueryClientProvider>
  );
}