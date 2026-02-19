import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandForm } from '@/components/brand/brand-form';

export default async function NewBrandPage() {
  const session = await auth();

  if (!session) {
    redirect('/sign-in');
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Brand</h1>
          <p className="text-muted-foreground">
            Set up your brand identity and guidelines
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Brand Details</CardTitle>
            <CardDescription>
              Configure your brand settings for consistent ad generation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BrandForm />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
