import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    
    const debugInfo = {
      requestUrl: url.href,
      hostname: url.hostname,
      protocol: url.protocol,
      pathname: url.pathname,
      env: {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
        NODE_ENV: process.env.NODE_ENV || 'NOT SET',
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET',
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET',
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
      },
      headers: {
        host: request.headers.get('host'),
        referer: request.headers.get('referer'),
      }
    };

    return NextResponse.json(debugInfo, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Debug endpoint error', details: String(error) }, { status: 500 });
  }
}