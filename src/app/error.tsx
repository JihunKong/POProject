'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ocean-blue-50 to-ocean-blue-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
        <div className="mb-6">
          <div className="text-6xl mb-4">😢</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            문제가 발생했습니다
          </h2>
          <p className="text-gray-600">
            예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
          </p>
        </div>
        
        <button
          onClick={reset}
          className="bg-ocean-blue-600 text-white px-6 py-3 rounded-lg hover:bg-ocean-blue-700 transition-colors"
        >
          다시 시도하기
        </button>
      </div>
    </div>
  );
}