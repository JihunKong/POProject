#!/usr/bin/env node

/**
 * Reset authentication tables to fix OAuthAccountNotLinked issue
 * This script will clean up the auth tables to start fresh
 */

const { PrismaClient } = require('@prisma/client');

async function resetAuthDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Resetting authentication database...');
    
    // Delete all auth-related data in proper order
    await prisma.session.deleteMany({});
    console.log('✅ Deleted all sessions');
    
    await prisma.account.deleteMany({});
    console.log('✅ Deleted all accounts');
    
    await prisma.user.deleteMany({});
    console.log('✅ Deleted all users');
    
    // Reset other user-dependent data
    await prisma.documentFeedbackJob.deleteMany({});
    console.log('✅ Deleted all document feedback jobs');
    
    await prisma.message.deleteMany({});
    await prisma.conversation.deleteMany({});
    console.log('✅ Deleted all conversations and messages');
    
    await prisma.analytics.deleteMany({});
    console.log('✅ Deleted all analytics');
    
    await prisma.task.deleteMany({});
    await prisma.teamMember.deleteMany({});
    await prisma.progress.deleteMany({});
    await prisma.team.deleteMany({});
    console.log('✅ Deleted all team data');
    
    console.log('🎉 Authentication database reset complete!');
    console.log('Users can now log in fresh with their Google accounts.');
    
  } catch (error) {
    console.error('❌ Error resetting auth database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetAuthDatabase();