const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkJobStatus() {
  try {
    const jobId = 'cmeyenacu0001qn67qe5lue3k';
    
    // Check specific job
    const job = await prisma.documentFeedbackJob.findUnique({
      where: { id: jobId },
      include: { user: true }
    });
    
    console.log('🔍 Specific Job Status:');
    if (job) {
      console.log(JSON.stringify(job, null, 2));
    } else {
      console.log('❌ Job not found');
    }
    
    // Check all recent jobs
    const recentJobs = await prisma.documentFeedbackJob.findMany({
      orderBy: { startedAt: 'desc' },
      take: 10,
      include: { user: true }
    });
    
    console.log('\n📊 Recent Jobs:');
    recentJobs.forEach(job => {
      console.log(`ID: ${job.id}`);
      console.log(`Status: ${job.status}`);
      console.log(`Progress: ${job.progress}%`);
      console.log(`Started: ${job.startedAt}`);
      console.log(`Current Step: ${job.currentStep}`);
      console.log(`Error: ${job.error}`);
      console.log('---');
    });
    
    // Check stuck jobs
    const stuckJobs = await prisma.documentFeedbackJob.findMany({
      where: {
        status: 'PROCESSING',
        startedAt: {
          lt: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
        }
      }
    });
    
    console.log('\n⚠️  Stuck Jobs (Processing > 1 hour):');
    console.log(`Found ${stuckJobs.length} stuck jobs`);
    stuckJobs.forEach(job => {
      console.log(`ID: ${job.id}, Started: ${job.startedAt}, Progress: ${job.progress}%`);
    });
    
  } catch (error) {
    console.error('❌ Database query error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkJobStatus();