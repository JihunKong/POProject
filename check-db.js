// Simple script to check database connectivity
// Run with: node check-db.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('Checking database connection...');
  
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Try to query users table
    const userCount = await prisma.user.count();
    console.log(`Found ${userCount} users`);
    
    // Try to query teams table
    const teamCount = await prisma.team.count();
    console.log(`Found ${teamCount} teams`);
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Make sure to run: npx prisma db push');
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();