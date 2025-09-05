import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

interface ToastNotificationProps {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  duration?: number;
  onClose: () => void;
}

export default function ToastNotification({
  type,
  title,
  message,
  duration = 5000,
  onClose
}: ToastNotificationProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200'
  };

  const textColors = {
    success: 'text-green-800',
    error: 'text-red-800',
    info: 'text-blue-800'
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-50
        max-w-sm w-full
        ${bgColors[type]} 
        border rounded-lg shadow-lg
        p-4 pr-12
        animate-slide-in-right
      `}
    >
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-1 hover:bg-gray-100 rounded-full transition-colors"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {icons[type]}
        </div>
        <div className="flex-1">
          <h3 className={`font-semibold ${textColors[type]}`}>
            {title}
          </h3>
          <p className={`mt-1 text-sm ${textColors[type]} opacity-90`}>
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}