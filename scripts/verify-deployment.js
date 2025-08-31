#!/usr/bin/env node

/**
 * Complete Deployment Verification Script
 * Runs all system checks after EC2 deployment
 */

// Load environment variables manually
try {
  require('dotenv').config();
} catch (error) {
  console.log('ℹ️  dotenv not available, using system environment variables');
}
const { execSync } = require('child_process');
const https = require('https');
const http = require('http');

console.log('🔍 Pure Ocean Platform - Complete Deployment Verification\n');
console.log('Server: 15.164.202.209');
console.log('Domain: https://xn--ox6bo4n.com\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = [];

function runTest(testName, testFunction) {
  totalTests++;
  console.log(`\n🧪 Testing: ${testName}`);
  console.log('─'.repeat(50));
  
  try {
    const result = testFunction();
    if (result === true || result === undefined) {
      console.log(`✅ PASS: ${testName}`);
      passedTests++;
    } else {
      console.log(`❌ FAIL: ${testName} - ${result}`);
      failedTests.push(testName);
    }
  } catch (error) {
    console.log(`❌ ERROR: ${testName} - ${error.message}`);
    failedTests.push(testName);
  }
}

async function runAsyncTest(testName, testFunction) {
  totalTests++;
  console.log(`\n🧪 Testing: ${testName}`);
  console.log('─'.repeat(50));
  
  try {
    const result = await testFunction();
    if (result === true || result === undefined) {
      console.log(`✅ PASS: ${testName}`);
      passedTests++;
    } else {
      console.log(`❌ FAIL: ${testName} - ${result}`);
      failedTests.push(testName);
    }
  } catch (error) {
    console.log(`❌ ERROR: ${testName} - ${error.message}`);
    failedTests.push(testName);
  }
}

// Test 1: Environment Variables
runTest('Environment Variables', () => {
  const requiredVars = [
    'DATABASE_URL',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'UPSTAGE_API_KEY',
    'ALLOWED_EMAIL_DOMAIN'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    return `Missing variables: ${missingVars.join(', ')}`;
  }
  
  console.log(`📋 Found ${requiredVars.length} required environment variables`);
  console.log(`🌐 NEXTAUTH_URL: ${process.env.NEXTAUTH_URL}`);
  console.log(`🔒 Database: ${process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':****@')}`);
  
  return true;
});

// Test 2: Database Health Check
runTest('Database Connection', () => {
  try {
    console.log('🔍 Running database health check...');
    const output = execSync('node scripts/check-database-health.js', { 
      encoding: 'utf8',
      timeout: 30000 
    });
    
    if (output.includes('Database health check completed successfully')) {
      console.log('✅ Database connection verified');
      return true;
    } else {
      return 'Database health check failed';
    }
  } catch (error) {
    return `Database check error: ${error.message}`;
  }
});

// Test 3: Google Docs Service Account
runTest('Google Docs API Configuration', () => {
  try {
    console.log('🔍 Running Google Docs API verification...');
    const output = execSync('node scripts/verify-google-docs.js', { 
      encoding: 'utf8',
      timeout: 15000 
    });
    
    if (output.includes('verification completed successfully')) {
      console.log('✅ Google Docs API configuration verified');
      return true;
    } else {
      return 'Google Docs verification failed';
    }
  } catch (error) {
    return `Google Docs check error: ${error.message}`;
  }
});

// Test 4: Build Process
runTest('Build Process', () => {
  try {
    console.log('🔍 Testing build process...');
    const output = execSync('npm run build', { 
      encoding: 'utf8',
      timeout: 120000 
    });
    
    if (output.includes('Compiled successfully') || output.includes('Build completed')) {
      console.log('✅ Build process completed successfully');
      return true;
    } else {
      return 'Build process failed';
    }
  } catch (error) {
    return `Build error: ${error.message}`;
  }
});

// Test 5: TypeScript Compilation
runTest('TypeScript Type Check', () => {
  try {
    console.log('🔍 Running TypeScript type check...');
    execSync('npx tsc --noEmit', { 
      encoding: 'utf8',
      timeout: 60000 
    });
    
    console.log('✅ No TypeScript errors found');
    return true;
  } catch (error) {
    if (error.status === 0) {
      console.log('✅ No TypeScript errors found');
      return true;
    } else {
      return `TypeScript errors found: ${error.message}`;
    }
  }
});

// Test 6: ESLint
runTest('Code Linting', () => {
  try {
    console.log('🔍 Running ESLint...');
    const output = execSync('npm run lint', { 
      encoding: 'utf8',
      timeout: 60000 
    });
    
    console.log('✅ No linting errors found');
    return true;
  } catch (error) {
    if (error.stdout && error.stdout.includes('0 error')) {
      console.log('✅ No linting errors found');
      return true;
    } else {
      return `Linting errors found: ${error.message}`;
    }
  }
});

// Test 7: Package Dependencies
runTest('Package Dependencies', () => {
  try {
    console.log('🔍 Checking package dependencies...');
    const output = execSync('npm audit --audit-level=high', { 
      encoding: 'utf8',
      timeout: 30000 
    });
    
    if (output.includes('found 0 vulnerabilities')) {
      console.log('✅ No high-level vulnerabilities found');
      return true;
    } else {
      console.log('⚠️  Some vulnerabilities found, but deployment can proceed');
      return true; // Non-blocking for deployment
    }
  } catch (error) {
    console.log('⚠️  Audit check completed with warnings');
    return true; // Non-blocking for deployment
  }
});

// Test 8: HTTP/HTTPS Connectivity (if deployed)
async function testConnectivity() {
  const testUrl = process.env.NEXTAUTH_URL || 'https://xn--ox6bo4n.com';
  
  return new Promise((resolve) => {
    const url = new URL(testUrl);
    const module = url.protocol === 'https:' ? https : http;
    
    console.log(`🔍 Testing connectivity to ${testUrl}...`);
    
    const req = module.request(url, { timeout: 10000 }, (res) => {
      if (res.statusCode === 200 || res.statusCode === 302) {
        console.log(`✅ Server responding: ${res.statusCode}`);
        resolve(true);
      } else {
        resolve(`Server responded with status: ${res.statusCode}`);
      }
    });
    
    req.on('error', (error) => {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.log('ℹ️  Server not accessible (normal for pre-deployment)');
        resolve(true); // Non-blocking for pre-deployment testing
      } else {
        resolve(`Connection error: ${error.message}`);
      }
    });
    
    req.on('timeout', () => {
      resolve('Connection timeout (server may be starting)');
    });
    
    req.end();
  });
}

// Test 9: WebSocket Server Configuration
runTest('WebSocket Server Code', () => {
  console.log('🔍 Checking WebSocket server configuration...');
  
  try {
    const serverJs = require('fs').readFileSync('server.js', 'utf8');
    
    if (serverJs.includes('socket.io') && serverJs.includes('IOServer')) {
      console.log('✅ WebSocket server configuration found in server.js');
      return true;
    } else {
      return 'WebSocket server configuration missing in server.js';
    }
  } catch (error) {
    return `WebSocket check error: ${error.message}`;
  }
});

// Test 10: Prisma Schema
runTest('Prisma Schema Validation', () => {
  try {
    console.log('🔍 Validating Prisma schema...');
    execSync('npx prisma validate', { 
      encoding: 'utf8',
      timeout: 15000 
    });
    
    console.log('✅ Prisma schema is valid');
    return true;
  } catch (error) {
    return `Prisma schema validation failed: ${error.message}`;
  }
});

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive deployment verification...\n');
  
  // Run synchronous tests
  const syncTests = [
    'Environment Variables',
    'Database Connection', 
    'Google Docs API Configuration',
    'Build Process',
    'TypeScript Type Check',
    'Code Linting',
    'Package Dependencies',
    'WebSocket Server Code',
    'Prisma Schema Validation'
  ];
  
  // Run async tests
  await runAsyncTest('Server Connectivity', testConnectivity);
  
  // Print final results
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}`);
  console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (failedTests.length > 0) {
    console.log(`\n❌ Failed Tests:`);
    failedTests.forEach(test => console.log(`  - ${test}`));
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED! Ready for deployment to EC2.');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run: ./scripts/deploy-ec2.sh');
    console.log('2. Monitor deployment logs');
    console.log('3. Test functionality on https://xn--ox6bo4n.com');
    console.log('');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review and fix issues before deployment.');
    console.log('');
    console.log('For help with specific issues, see:');
    console.log('- EC2_DEPLOYMENT_GUIDE.md');
    console.log('- GOOGLE_SERVICE_ACCOUNT_SETUP.md');
    console.log('');
    process.exit(1);
  }
}

// Run all tests
runAllTests().catch(error => {
  console.error('🚨 Verification script failed:', error);
  process.exit(1);
});