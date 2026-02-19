import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { MainLayout } from '@/components/layout/main-layout';
import { CampaignEditForm } from '@/components/campaign/campaign-edit-form';

export default async function CampaignEditPage({
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
    },
  });

  if (!campaign) {
    notFound();
  }

  const brands = await prisma.brand.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
  });

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-6">Edit Campaign</h1>
        <CampaignEditForm campaign={campaign} brands={brands} />
      </div>
    </MainLayout>
  );
}
