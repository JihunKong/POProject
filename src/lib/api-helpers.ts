import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function requireRole(roles: string[]) {
  const session = await requireAuth();
  if (!roles.includes(session.user.role)) {
    throw new Error('Forbidden');
  }
  return session;
}

export function handleApiError(error: unknown) {
  console.error('API Error:', error);
  
  // Log full error details in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Full error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });
  }
  
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  
  if (errorMessage === 'Unauthorized') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  if (errorMessage === 'Forbidden') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // In development, include more error details
  const errorResponse = process.env.NODE_ENV === 'development' 
    ? { error: 'Internal Server Error', details: errorMessage }
    : { error: 'Internal Server Error' };
  
  return new Response(JSON.stringify(errorResponse), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function createApiResponse<T>(data: T, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function validateRequest(req: NextRequest, requiredFields: string[]) {
  try {
    const body = await req.json();
    
    for (const field of requiredFields) {
      if (!body[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    return body;
  } catch {
    throw new Error('Invalid request body');
  }
}