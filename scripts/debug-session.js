#!/usr/bin/env node

/**
 * Debug session and JWT token structure
 */

const { auth } = require('../src/lib/auth');

async function debugSession() {
  try {
    console.log('🔍 Debugging authentication session...');
    
    // This would normally be called by the API route
    const session = await auth();
    
    if (!session) {
      console.log('❌ No session found');
      return;
    }
    
    console.log('📊 Session object:', JSON.stringify(session, null, 2));
    
    if (session.user) {
      console.log('👤 User in session:', JSON.stringify(session.user, null, 2));
      console.log('🆔 session.user.id:', session.user.id);
      console.log('📧 session.user.email:', session.user.email);
      console.log('📛 session.user.name:', session.user.name);
    } else {
      console.log('❌ No user in session');
    }
    
  } catch (error) {
    console.error('💥 Error debugging session:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugSession();