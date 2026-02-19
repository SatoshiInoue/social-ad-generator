import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { MainLayout } from '@/components/layout/main-layout';
import { CampaignWizard } from '@/components/campaign/campaign-wizard';

export default async function NewCampaignPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const brands = await prisma.brand.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Campaign</h1>
          <p className="text-muted-foreground">
            Set up a new ad campaign with AI-generated assets
          </p>
        </div>

        <CampaignWizard brands={brands} />
      </div>
    </MainLayout>
  );
}
