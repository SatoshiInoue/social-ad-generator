import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { History } from 'lucide-react';

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const params = await searchParams;
  const search = params.search || '';

  const campaigns = await prisma.campaign.findMany({
    where: {
      userId: session.user.id,
      ...(search && {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      }),
    },
    include: {
      brand: true,
      _count: {
        select: { generatedAssets: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaign History</h1>
          <p className="text-muted-foreground">
            View and search your past campaigns
          </p>
        </div>

        <div className="flex gap-4">
          <Input
            placeholder="Search campaigns..."
            defaultValue={search}
            className="max-w-sm"
          />
        </div>

        {campaigns.length === 0 ? (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                <History className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>No campaigns found</CardTitle>
              <CardDescription>
                {search ? 'Try a different search term' : 'Create your first campaign to get started'}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{campaign.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {campaign.brand.name}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{campaign._count.generatedAssets} assets</span>
                          <span>•</span>
                          <span>Updated {formatDate(new Date(campaign.updatedAt))}</span>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          campaign.status === 'DRAFT'
                            ? 'bg-gray-100 text-gray-700'
                            : campaign.status === 'GENERATING'
                            ? 'bg-blue-100 text-blue-700'
                            : campaign.status === 'GENERATED'
                            ? 'bg-green-100 text-green-700'
                            : campaign.status === 'EDITING'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {campaign.status}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
