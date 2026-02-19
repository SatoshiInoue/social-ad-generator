import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkJobs(campaignId: string) {
  try {
    const jobs = await prisma.generationJob.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    console.log(`\n📊 Generation Jobs for Campaign: ${campaignId}\n`);

    if (jobs.length === 0) {
      console.log('No jobs found.');
      return;
    }

    for (const job of jobs) {
      console.log(`Job ID: ${job.id}`);
      console.log(`Status: ${job.status}`);
      console.log(`Progress: ${job.progress}%`);
      console.log(`Error: ${job.error || 'None'}`);
      console.log(`Created: ${job.createdAt}`);
      console.log(`Updated: ${job.updatedAt}`);
      console.log('---');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const campaignId = process.argv[2];
if (!campaignId) {
  console.error('Usage: npx tsx scripts/check-campaign-jobs.ts <campaign-id>');
  process.exit(1);
}

checkJobs(campaignId);
