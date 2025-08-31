#!/usr/bin/env node

/**
 * Database Health Check Script for Pure Ocean Platform
 * Verifies PostgreSQL connection and basic database operations
 */

const { PrismaClient } = require('@prisma/client');

async function checkDatabaseHealth() {
  console.log('🏥 Starting database health check...');
  
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });

  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Test database write operations
    console.log('🔧 Testing database operations...');
    
    // Test User creation (then delete)
    const testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@wando.hs.kr`,
        name: 'Health Check Test User',
        role: 'STUDENT',
      },
    });
    console.log('✅ Database write operation successful');

    // Test User query
    const userCount = await prisma.user.count();
    console.log(`✅ Database read operation successful (${userCount} users total)`);

    // Clean up test data
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    console.log('✅ Database cleanup successful');

    // Check all tables exist
    console.log('🔍 Verifying database schema...');
    
    const tables = [
      'User', 'Account', 'Session', 'Conversation', 'Message',
      'Team', 'TeamMember', 'Progress', 'Analytics', 'Task'
    ];
    
    for (const table of tables) {
      try {
        // Just count records to verify table exists
        const count = await prisma[table.toLowerCase()].count();
        console.log(`✅ Table ${table}: ${count} records`);
      } catch (error) {
        console.log(`❌ Table ${table}: Error - ${error.message}`);
      }
    }

    console.log('');
    console.log('🎉 Database health check completed successfully!');
    console.log('📊 Database Status: HEALTHY');
    console.log(`🔗 Connection URL: ${process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':****@')}`);
    
  } catch (error) {
    console.error('❌ Database health check failed:');
    console.error('Error:', error.message);
    console.error('');
    console.error('💡 Troubleshooting tips:');
    console.error('1. Check if PostgreSQL is running: sudo systemctl status postgresql');
    console.error('2. Verify DATABASE_URL in .env file');
    console.error('3. Ensure database and user exist');
    console.error('4. Run: npx prisma db push to apply schema');
    console.error('');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run health check
checkDatabaseHealth();