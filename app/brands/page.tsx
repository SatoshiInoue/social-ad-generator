import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Palette } from 'lucide-react';
import Link from 'next/link';

export default async function BrandsPage() {
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
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Brands</h1>
            <p className="text-muted-foreground">
              Manage your brand identities and guidelines
            </p>
          </div>
          <Link href="/brands/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Brand
            </Button>
          </Link>
        </div>

        {brands.length === 0 ? (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                <Palette className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>No brands yet</CardTitle>
              <CardDescription>
                Create your first brand to get started with ad campaigns
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Link href="/brands/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Brand
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {brands.map((brand) => (
              <Link key={brand.id} href={`/brands/${brand.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    {brand.logoUrl && (
                      <div className="mb-2 h-16 flex items-center">
                        <img
                          src={brand.logoUrl}
                          alt={brand.name}
                          className="h-full w-auto object-contain"
                        />
                      </div>
                    )}
                    <CardTitle>{brand.name}</CardTitle>
                    <CardDescription>
                      {brand.tone && `${brand.tone} • `}
                      {brand.style || 'No style set'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {brand.colorPalette && Array.isArray(brand.colorPalette) && brand.colorPalette.length > 0 && (
                      <div className="flex gap-1">
                        {(brand.colorPalette as string[]).slice(0, 5).map((color, index) => (
                          <div
                            key={index}
                            className="h-6 w-6 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                        {(brand.colorPalette as string[]).length > 5 && (
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs">
                            +{(brand.colorPalette as string[]).length - 5}
                          </div>
                        )}
                      </div>
                    )}
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
