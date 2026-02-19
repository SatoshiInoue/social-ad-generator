import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createBrandSchema = z.object({
  name: z.string().min(1, 'Brand name is required'),
  logoUrl: z.string().url().optional().nullable(),
  colorPalette: z.array(z.string()).optional().nullable(),
  guidelines: z.string().optional().nullable(),
  tone: z.string().optional().nullable(),
  style: z.string().optional().nullable(),
  prohibitedTerms: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const brands = await prisma.brand.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(brands);
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validatedData = createBrandSchema.parse(body);

    // Handle JSON fields properly for Prisma
    const createData: any = {
      ...validatedData,
      userId: session.user.id,
      prohibitedTerms: validatedData.prohibitedTerms || [],
    };

    if (createData.colorPalette === null) {
      createData.colorPalette = null;
    }

    const brand = await prisma.brand.create({
      data: createData,
    });

    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create brand' },
      { status: 500 }
    );
  }
}
