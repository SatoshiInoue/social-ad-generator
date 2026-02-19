import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { MainLayout } from '@/components/layout/main-layout';
import { MediaUpload } from '@/components/media/media-upload';
import { MediaGrid } from '@/components/media/media-grid';

export default async function MediaPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const assets = await prisma.mediaAsset.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
          <p className="text-muted-foreground">
            Upload and manage your campaign assets
          </p>
        </div>

        <MediaUpload />

        <div>
          <h2 className="text-xl font-semibold mb-4">Your Assets</h2>
          <MediaGrid assets={assets} />
        </div>
      </div>
    </MainLayout>
  );
}
