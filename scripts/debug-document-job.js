const { PrismaClient } = require('@prisma/client');
const { DocumentJobManager } = require('../src/lib/document-job.ts');

const prisma = new PrismaClient();

async function debugDocumentJob() {
  try {
    console.log('🔍 Document Job Debug Analysis');
    console.log('================================\n');
    
    // 1. Test job creation with the same parameters
    console.log('1. Testing job creation...');
    const testUserId = 'test-user-id';
    const testDocUrl = 'https://docs.google.com/document/d/1vPjvKXw4F1OtHLGtjgpNYi7y3LACGxfGGI5wM7K7TE0/edit?tab=t.0';
    const testGenre = '워크시트';
    
    try {
      // First create a test user
      await prisma.user.upsert({
        where: { email: 'test@wando.hs.kr' },
        update: {},
        create: {
          id: testUserId,
          email: 'test@wando.hs.kr',
          name: 'Test User'
        }
      });
      
      console.log('✅ Test user created/found');
      
      // Try to create a job
      const job = await DocumentJobManager.createJob(testUserId, testDocUrl, testGenre);
      console.log('✅ Job creation successful:', {
        id: job.id,
        status: job.status,
        documentId: job.documentId
      });
      
      // Test job retrieval
      const retrievedJob = await DocumentJobManager.getJob(job.id);
      console.log('✅ Job retrieval successful:', !!retrievedJob);
      
      // Clean up test job
      await prisma.documentFeedbackJob.delete({ where: { id: job.id } });
      console.log('✅ Test job cleaned up');
      
    } catch (jobError) {
      console.error('❌ Job creation/retrieval failed:', jobError);
    }
    
    // 2. Check Google API environment variables
    console.log('\n2. Checking Google API configuration...');
    const hasGoogleServiceAccount = !!process.env.GOOGLE_SERVICE_ACCOUNT;
    console.log('GOOGLE_SERVICE_ACCOUNT env var:', hasGoogleServiceAccount ? '✅ Present' : '❌ Missing');
    
    if (hasGoogleServiceAccount) {
      try {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
        console.log('✅ Service account JSON is valid');
        console.log('Service account email:', credentials.client_email || 'Not found');
      } catch (parseError) {
        console.error('❌ Service account JSON is invalid:', parseError.message);
      }
    }
    
    // 3. Check for stuck jobs
    console.log('\n3. Checking for stuck jobs...');
    const stuckJobs = await prisma.documentFeedbackJob.findMany({
      where: {
        status: 'PROCESSING',
        startedAt: {
          lt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
        }
      },
      include: { user: true }
    });
    
    if (stuckJobs.length > 0) {
      console.log(`⚠️ Found ${stuckJobs.length} stuck job(s):`);
      stuckJobs.forEach(job => {
        console.log(`- ID: ${job.id}, User: ${job.user.email}, Started: ${job.startedAt}`);
        console.log(`  Status: ${job.status}, Progress: ${job.progress}%, Step: ${job.currentStep}`);
        console.log(`  Error: ${job.error || 'None'}`);
      });
    } else {
      console.log('✅ No stuck jobs found');
    }
    
    // 4. Check API endpoint timeouts
    console.log('\n4. Analyzing timeout configurations...');
    console.log('API Route maxDuration: 10 seconds (good for job creation)');
    console.log('Background processing: No explicit timeout (potential issue)');
    console.log('Google API calls: No explicit timeout (potential issue)');
    console.log('Change detection: 5 minutes max wait time');
    
    // 5. Check database connection
    console.log('\n5. Testing database connection...');
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database connection successful');
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError);
    }
    
    console.log('\n================================');
    console.log('Debug analysis complete');
    
  } catch (error) {
    console.error('❌ Debug script error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug analysis
debugDocumentJob();