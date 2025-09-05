import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, AlertCircle, Clock, ChevronDown } from 'lucide-react';

interface BackgroundTask {
  id: string;
  type: string;
  status: 'processing' | 'completed' | 'failed';
  startTime: Date;
  documentUrl?: string;
  genre?: string;
  progress?: number;
  error?: string;
}

interface BackgroundTaskIndicatorProps {
  tasks: BackgroundTask[];
  onTaskClick?: (taskId: string) => void;
}

export default function BackgroundTaskIndicator({
  tasks,
  onTaskClick
}: BackgroundTaskIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<Record<string, string>>({});

  // 경과 시간 업데이트
  useEffect(() => {
    const updateElapsedTime = () => {
      const times: Record<string, string> = {};
      tasks.forEach(task => {
        if (task.status === 'processing') {
          const elapsed = Date.now() - task.startTime.getTime();
          const minutes = Math.floor(elapsed / 60000);
          const seconds = Math.floor((elapsed % 60000) / 1000);
          times[task.id] = `${minutes}분 ${seconds}초 경과`;
        }
      });
      setElapsedTime(times);
    };

    updateElapsedTime();
    const interval = setInterval(updateElapsedTime, 1000);
    return () => clearInterval(interval);
  }, [tasks]);

  const activeTasks = tasks.filter(t => t.status === 'processing');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const failedTasks = tasks.filter(t => t.status === 'failed');

  if (tasks.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-40">
      {/* 메인 인디케이터 */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow"
      >
        {activeTasks.length > 0 ? (
          <>
            <div className="relative">
              <FileText className="w-5 h-5 text-blue-500" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {activeTasks.length}개 처리 중
            </span>
          </>
        ) : completedTasks.length > 0 ? (
          <>
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-gray-700">
              완료됨
            </span>
          </>
        ) : failedTasks.length > 0 ? (
          <>
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-gray-700">
              오류 발생
            </span>
          </>
        ) : null}
        
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
      </button>

      {/* 상세 정보 드롭다운 */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">문서 처리 상태</h3>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {tasks.map(task => (
              <div
                key={task.id}
                onClick={() => onTaskClick?.(task.id)}
                className="p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {task.status === 'processing' ? (
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      ) : task.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium text-gray-700">
                        {task.genre || '문서'} 분석
                      </span>
                    </div>
                    
                    {task.status === 'processing' && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{elapsedTime[task.id] || '계산 중...'}</span>
                      </div>
                    )}
                    
                    {task.status === 'completed' && (
                      <p className="mt-1 text-xs text-green-600">
                        피드백이 문서에 추가되었습니다
                      </p>
                    )}
                    
                    {task.status === 'failed' && (
                      <p className="mt-1 text-xs text-red-600">
                        {task.error || '처리 중 오류가 발생했습니다'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {tasks.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500">
              처리 중인 작업이 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  );
}