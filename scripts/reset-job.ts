import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetJob(jobId: string) {
  try {
    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!job) {
      console.log('❌ Job not found:', jobId);
      return;
    }

    console.log('\n📊 Job Status:');
    console.log('ID:', job.id);
    console.log('Campaign:', job.campaign.name);
    console.log('Status:', job.status);
    console.log('Progress:', job.progress);
    console.log('Error:', job.error);
    console.log('Created:', job.createdAt);
    console.log('Updated:', job.updatedAt);

    // Delete the failed job
    await prisma.generationJob.delete({
      where: { id: jobId },
    });

    console.log('\n✅ Job deleted successfully!');
    console.log('\n💡 You can now retry generation on the campaign page.');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const jobId = process.argv[2];

if (!jobId) {
  console.error('Usage: npx tsx scripts/reset-job.ts <job-id>');
  process.exit(1);
}

resetJob(jobId);
