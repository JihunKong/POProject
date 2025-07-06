const { execSync } = require('child_process');

console.log('🔄 Checking database schema...');

try {
  // Try to run a simple query to check if tables exist
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
  console.log('✅ Database schema is up to date');
} catch (error) {
  console.error('❌ Failed to update database schema:', error.message);
}

// Start the Next.js server
console.log('🚀 Starting Next.js server...');
require('next/dist/cli/next-start');