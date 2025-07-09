'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  
  // 디버깅을 위한 로그
  console.log('Auth error page - Error type:', error);
  console.log('All search params:', Object.fromEntries(searchParams.entries()));

  const getErrorMessage = () => {
    switch (error) {
      case 'Signin':
        return '로그인 중 문제가 발생했습니다.';
      case 'OAuthSignin':
        return 'Google 로그인을 시작할 수 없습니다.';
      case 'OAuthCallback':
        return 'Google 인증 중 문제가 발생했습니다.';
      case 'OAuthCreateAccount':
        return '계정을 생성할 수 없습니다.';
      case 'EmailCreateAccount':
        return '이메일 계정을 생성할 수 없습니다.';
      case 'Callback':
        return '인증 콜백 처리 중 문제가 발생했습니다.';
      case 'OAuthAccountNotLinked':
        return '이미 다른 방법으로 가입된 이메일입니다.';
      case 'EmailSignin':
        return '이메일 로그인 중 문제가 발생했습니다.';
      case 'CredentialsSignin':
        return '로그인 정보가 올바르지 않습니다.';
      case 'AccessDenied':
        return '접근이 거부되었습니다.';
      default:
        return '인증 중 알 수 없는 오류가 발생했습니다.';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ocean-blue-50 to-ocean-blue-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
        <div className="mb-6">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            인증 오류
          </h1>
          <p className="text-gray-600">
            {getErrorMessage()}
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full bg-ocean-blue-600 text-white py-3 px-4 rounded-lg hover:bg-ocean-blue-700 transition-colors"
          >
            다시 로그인하기
          </Link>
          
          <Link
            href="/"
            className="block w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
          >
            홈으로 돌아가기
          </Link>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          계속해서 문제가 발생하면 담당 교사에게 문의해주세요.
        </p>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ocean-blue-50 to-ocean-blue-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-blue-600"></div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}