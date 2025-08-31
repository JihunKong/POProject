const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeIssue() {
  try {
    console.log('🔍 Document Feedback Issue Analysis');
    console.log('===================================\n');
    
    // 1. Check for the specific job ID that was reported
    console.log('1. Checking for specific job ID: cmeyenacu0001qn67qe5lue3k');
    const specificJob = await prisma.documentFeedbackJob.findUnique({
      where: { id: 'cmeyenacu0001qn67qe5lue3k' },
      include: { user: true }
    });
    
    if (specificJob) {
      console.log('✅ Job found:', JSON.stringify(specificJob, null, 2));
    } else {
      console.log('❌ Job NOT FOUND - This is the core issue!');
    }
    
    // 2. Check all recent jobs
    console.log('\n2. Recent DocumentFeedbackJob records (last 24 hours):');
    const recentJobs = await prisma.documentFeedbackJob.findMany({
      where: {
        startedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
        }
      },
      orderBy: { startedAt: 'desc' },
      include: { user: true }
    });
    
    if (recentJobs.length === 0) {
      console.log('❌ NO JOBS FOUND IN LAST 24 HOURS');
      console.log('This indicates job creation is failing completely!');
    } else {
      console.log(`✅ Found ${recentJobs.length} recent jobs:`);
      recentJobs.forEach(job => {
        console.log(`- ID: ${job.id}, Status: ${job.status}, Progress: ${job.progress}%`);
        console.log(`  User: ${job.user?.email}, Started: ${job.startedAt}`);
        console.log(`  Error: ${job.error || 'None'}`);
      });
    }
    
    // 3. Check all users to see if authentication might be the issue
    console.log('\n3. Checking users table:');
    const userCount = await prisma.user.count();
    console.log(`Total users: ${userCount}`);
    
    if (userCount === 0) {
      console.log('❌ No users found - authentication flow might be broken');
    }
    
    // 4. Check environment variables
    console.log('\n4. Environment Variable Check:');
    const envVars = [
      'DATABASE_URL',
      'GOOGLE_SERVICE_ACCOUNT',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL',
      'UPSTAGE_API_KEY'
    ];
    
    envVars.forEach(varName => {
      const exists = !!process.env[varName];
      console.log(`${varName}: ${exists ? '✅ Set' : '❌ Missing'}`);
    });
    
    // 5. Check if Google Service Account JSON is valid
    if (process.env.GOOGLE_SERVICE_ACCOUNT) {
      try {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
        console.log('✅ Google Service Account JSON is valid');
        console.log(`Service account: ${credentials.client_email || 'Email not found'}`);
      } catch (error) {
        console.log('❌ Google Service Account JSON is invalid:', error.message);
      }
    }
    
    // 6. Test database transactions
    console.log('\n5. Testing database transaction capability:');
    try {
      await prisma.$transaction(async (tx) => {
        const testUser = await tx.user.findFirst();
        console.log('✅ Database transactions work');
      });
    } catch (error) {
      console.log('❌ Database transaction failed:', error.message);
    }
    
    console.log('\n===================================');
    console.log('ANALYSIS SUMMARY:');
    console.log('1. The reported job ID does NOT exist in database');
    console.log('2. This indicates the job creation process failed silently');
    console.log('3. Possible causes:');
    console.log('   - Database connection issues during job creation');
    console.log('   - Transaction rollback due to validation errors');  
    console.log('   - Authentication failures before job creation');
    console.log('   - Google API credential issues');
    console.log('   - Silent exceptions in DocumentJobManager.createJob()');
    
  } catch (error) {
    console.error('❌ Analysis error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeIssue();