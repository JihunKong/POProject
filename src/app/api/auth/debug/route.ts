import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      requestUrl: url.href,
      hostname: url.hostname,
      protocol: url.protocol,
      pathname: url.pathname,
      env: {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
        NODE_ENV: process.env.NODE_ENV || 'NOT SET',
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? `SET (${process.env.GOOGLE_CLIENT_ID?.substring(0, 10)}...)` : 'NOT SET',
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET (hidden)' : 'NOT SET',
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? `SET (${process.env.NEXTAUTH_SECRET.length} chars)` : 'NOT SET',
      },
      headers: {
        host: request.headers.get('host'),
        referer: request.headers.get('referer'),
        'user-agent': request.headers.get('user-agent')?.substring(0, 50) + '...',
        'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
        'x-forwarded-for': request.headers.get('x-forwarded-for'),
        'accept': request.headers.get('accept'),
      },
      nextAuthTest: {
        message: 'Testing NextAuth availability',
        authFunction: 'Unknown',
        configurationStatus: 'Testing'
      }
    };

    // Try to import and test NextAuth
    try {
      await import('@/lib/auth');
      debugInfo.nextAuthTest = {
        message: 'NextAuth import successful',
        authFunction: 'Available',
        configurationStatus: 'Loaded'
      };
    } catch (authError: unknown) {
      const error = authError as Error;
      debugInfo.nextAuthTest = {
        message: 'NextAuth import failed',
        error: error?.message || 'Unknown auth error',
        configurationStatus: 'Failed'
      };
    }

    return NextResponse.json(debugInfo, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ 
      error: 'Debug endpoint error', 
      message: err?.message || 'Unknown error',
      stack: err?.stack?.substring(0, 500)
    }, { status: 500 });
  }
}