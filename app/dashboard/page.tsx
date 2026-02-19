import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const recentCampaigns = await prisma.campaign.findMany({
    where: { userId: session.user.id },
    include: { brand: true },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {session.user?.name}!
            </p>
          </div>
          <Link href="/campaigns/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Recent Campaigns</CardTitle>
              <CardDescription>Your latest ad campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {recentCampaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No campaigns yet. Create your first campaign to get started!
                </p>
              ) : (
                <ul className="space-y-2">
                  {recentCampaigns.map((campaign) => (
                    <li key={campaign.id}>
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-muted transition-colors"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate font-medium">{campaign.name}</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {campaign.status.toLowerCase()}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Brands</CardTitle>
              <CardDescription>Manage your brands</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/brands">
                <Button variant="outline" className="w-full">
                  View Brands
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Media Library</CardTitle>
              <CardDescription>Your uploaded assets</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/media">
                <Button variant="outline" className="w-full">
                  Browse Media
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
