/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // FORCE DISABLE ALL CACHING - 캐시 완전 비활성화
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // FORCE NO CACHE - 모든 캐시 비활성화
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  // Handle both Korean domain and Punycode
  async redirects() {
    return [
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'www.xn--ox6bo4n.com',
          },
        ],
        destination: 'https://xn--ox6bo4n.com/',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;