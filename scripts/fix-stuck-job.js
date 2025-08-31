const { PrismaClient } = require('@prisma/client');

async function fixStuckJob() {
  const prisma = new PrismaClient();
  
  try {
    const jobId = 'cmeyenacu0001qn67qe5lue3k';
    
    console.log(`🔧 Fixing stuck job ${jobId}...`);
    
    // 현재 job 상태 확인
    const currentJob = await prisma.documentFeedbackJob.findUnique({
      where: { id: jobId }
    });
    
    if (!currentJob) {
      console.log('❌ Job not found');
      return;
    }
    
    console.log('📊 Current job status:', {
      status: currentJob.status,
      progress: currentJob.progress,
      currentStep: currentJob.currentStep,
      startedAt: currentJob.startedAt,
      error: currentJob.error
    });
    
    // FAILED 상태로 변경
    const updatedJob = await prisma.documentFeedbackJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        error: '시스템 타임아웃으로 인한 작업 중단 (1시간 경과)',
        currentStep: '시스템 타임아웃',
        completedAt: new Date()
      }
    });
    
    console.log('✅ Job fixed:', {
      status: updatedJob.status,
      error: updatedJob.error,
      completedAt: updatedJob.completedAt
    });
    
    console.log('🔄 User can now retry the document feedback process');
    
  } catch (error) {
    console.error('❌ Error fixing job:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixStuckJob();