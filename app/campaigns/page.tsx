import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CampaignCard } from '@/components/campaign/campaign-card';
import { Plus, FileText } from 'lucide-react';
import Link from 'next/link';

export default async function CampaignsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const campaigns = await prisma.campaign.findMany({
    where: { userId: session.user.id },
    include: {
      brand: true,
      brief: true,
      _count: {
        select: { generatedAssets: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
            <p className="text-muted-foreground">
              Manage your advertising campaigns
            </p>
          </div>
          <Link href="/campaigns/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>No campaigns yet</CardTitle>
              <CardDescription>
                Create your first campaign to generate ad assets
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Link href="/campaigns/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Campaign
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign as any} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
