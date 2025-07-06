const { spawn } = require('child_process');

console.log('🔄 Checking database schema...');

// Run prisma db push
const prisma = spawn('npx', ['prisma', 'db', 'push', '--skip-generate'], {
  stdio: 'inherit',
  env: process.env
});

prisma.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Database schema is up to date');
  } else {
    console.error('❌ Failed to update database schema');
  }
  
  // Start the Next.js server
  console.log('🚀 Starting Next.js server...');
  const next = spawn('npm', ['run', 'start'], {
    stdio: 'inherit',
    env: process.env
  });
  
  next.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
});