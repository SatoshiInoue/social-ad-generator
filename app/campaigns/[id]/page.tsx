import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { MainLayout } from '@/components/layout/main-layout';
import { CampaignDetail } from '@/components/campaign/campaign-detail';

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const { id } = await params;

  const campaign = await prisma.campaign.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    include: {
      brand: true,
      brief: true,
      generatedAssets: {
        include: {
          complianceScore: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      generationJobs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!campaign) {
    notFound();
  }

  return (
    <MainLayout>
      <CampaignDetail campaign={campaign} />
    </MainLayout>
  );
}
