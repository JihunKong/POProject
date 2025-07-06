import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ocean-blue-50 to-ocean-blue-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
        <div className="mb-6">
          <div className="text-8xl font-bold text-ocean-blue-600 mb-4">404</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            페이지를 찾을 수 없습니다
          </h2>
          <p className="text-gray-600">
            요청하신 페이지가 존재하지 않거나 이동되었습니다.
          </p>
        </div>
        
        <Link
          href="/"
          className="inline-block bg-ocean-blue-600 text-white px-6 py-3 rounded-lg hover:bg-ocean-blue-700 transition-colors"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}