import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const host = requestHeaders.get('host') || '';
  const proto = requestHeaders.get('x-forwarded-proto') || 'https';
  
  // Force HTTPS in production only (exclude localhost and development)
  if (process.env.NODE_ENV === 'production' && 
      proto !== 'https' && 
      !host.includes('localhost') && 
      !host.includes('127.0.0.1')) {
    return NextResponse.redirect(
      `https://${host}${request.nextUrl.pathname}${request.nextUrl.search}`,
      301
    );
  }
  
  // Handle www subdomain redirect
  if (host.startsWith('www.')) {
    const newHost = host.replace('www.', '');
    return NextResponse.redirect(
      `https://${newHost}${request.nextUrl.pathname}${request.nextUrl.search}`,
      301
    );
  }
  
  // Check authentication for protected routes
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith('/chat') || pathname.startsWith('/api/chat')) {
    const session = await auth();
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  // Add security headers
  const response = NextResponse.next();
  
  // Strict Transport Security - tells browsers to only use HTTPS
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  
  // Content Security Policy - helps prevent XSS attacks
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://api.openai.com https://www.googleapis.com; frame-src 'self' https://accounts.google.com;"
  );
  
  // X-Frame-Options - prevents clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // X-Content-Type-Options - prevents MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // X-DNS-Prefetch-Control - controls DNS prefetching
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  
  // Referrer-Policy - controls referrer information
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  
  // Permissions-Policy - controls browser features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};