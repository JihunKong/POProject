import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Health check endpoint for monitoring and load balancer
export async function GET() {
  const startTime = Date.now();
  
  try {
    // Initialize health check response
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '0.1.0',
      checks: {
        database: { status: 'unknown' as string, responseTime: 0, error: null as string | null },
        memory: { status: 'unknown' as string, usage: null as object | null, error: null as string | null },
        process: { status: 'healthy' as string, pid: process.pid, error: null as string | null }
      },
      metadata: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        hostname: process.env.HOSTNAME || 'unknown'
      }
    };

    // Database health check
    try {
      const dbStartTime = Date.now();
      const prisma = new PrismaClient({
        log: ['error'], // Minimal logging for health checks
      });
      
      // Simple query to test database connectivity
      await prisma.$queryRaw`SELECT 1`;
      
      healthCheck.checks.database = {
        status: 'healthy' as const,
        responseTime: Date.now() - dbStartTime,
        error: null
      };
      
      await prisma.$disconnect();
    } catch (dbError: unknown) {
      healthCheck.checks.database = {
        status: 'unhealthy' as const,
        responseTime: Date.now() - startTime,
        error: dbError instanceof Error ? dbError.message : 'Database connection failed'
      };
      healthCheck.status = 'degraded';
    }

    // Memory health check
    try {
      const memUsage = process.memoryUsage();
      const memUsageMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      };

      // Check if memory usage is within acceptable limits
      const memoryStatus = memUsageMB.heapUsed > 400 ? 'warning' : 'healthy';
      
      healthCheck.checks.memory = {
        status: memoryStatus as 'healthy' | 'warning',
        usage: memUsageMB,
        error: null
      };

      if (memoryStatus === 'warning') {
        healthCheck.status = 'degraded';
      }
    } catch (memError: unknown) {
      healthCheck.checks.memory = {
        status: 'unhealthy' as const,
        usage: null,
        error: memError instanceof Error ? memError.message : 'Memory check failed'
      };
      healthCheck.status = 'degraded';
    }

    // Determine overall health status
    const hasUnhealthyChecks = Object.values(healthCheck.checks)
      .some(check => check.status === 'unhealthy');
    
    if (hasUnhealthyChecks) {
      healthCheck.status = 'unhealthy';
    }

    // Set appropriate HTTP status code
    const httpStatus = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'degraded' ? 200 : 503;

    // Add response time to metadata
    (healthCheck.metadata as typeof healthCheck.metadata & { responseTime: number }).responseTime = Date.now() - startTime;

    return NextResponse.json(healthCheck, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Content-Type': 'application/json'
      }
    });

  } catch (error: unknown) {
    // Critical error - return unhealthy status
    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed',
      uptime: process.uptime(),
      metadata: {
        responseTime: Date.now() - startTime,
        nodeVersion: process.version,
        platform: process.platform,
        hostname: process.env.HOSTNAME || 'unknown'
      }
    };

    return NextResponse.json(errorResponse, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Content-Type': 'application/json'
      }
    });
  }
}

// Support HEAD requests for lightweight health checks
export async function HEAD() {
  try {
    // Quick health check without full response body
    const prisma = new PrismaClient({ log: [] });
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    
    return new Response(null, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json'
      }
    });
  } catch {
    return new Response(null, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json'
      }
    });
  }
}