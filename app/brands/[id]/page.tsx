import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandForm } from '@/components/brand/brand-form';
import { notFound } from 'next/navigation';

export default async function BrandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const { id } = await params;

  const brand = await prisma.brand.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (!brand) {
    notFound();
  }

  // Type cast JSON fields from Prisma
  const brandData = {
    ...brand,
    colorPalette: brand.colorPalette as string[] | null,
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Brand</h1>
          <p className="text-muted-foreground">
            Update your brand identity and guidelines
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{brand.name}</CardTitle>
            <CardDescription>
              Manage brand settings and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BrandForm brand={brandData} />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
