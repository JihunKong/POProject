export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ocean-blue-50 to-ocean-blue-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-ocean-blue-600 mx-auto mb-4"></div>
        <p className="text-ocean-blue-700">로딩 중...</p>
      </div>
    </div>
  );
}