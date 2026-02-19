import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateBrandSchema = z.object({
  name: z.string().min(1).optional(),
  logoUrl: z.string().url().optional().nullable(),
  colorPalette: z.array(z.string()).optional().nullable(),
  guidelines: z.string().optional().nullable(),
  tone: z.string().optional().nullable(),
  style: z.string().optional().nullable(),
  prohibitedTerms: z.array(z.string()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const brand = await prisma.brand.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
  }

  return NextResponse.json(brand);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const validatedData = updateBrandSchema.parse(body);

    const brand = await prisma.brand.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Handle JSON fields properly for Prisma
    const updateData: any = { ...validatedData };
    if (validatedData.colorPalette === null) {
      updateData.colorPalette = null;
    }

    const updatedBrand = await prisma.brand.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedBrand);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update brand' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const brand = await prisma.brand.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
  }

  await prisma.brand.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
