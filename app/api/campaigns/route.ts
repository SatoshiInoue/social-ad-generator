import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createCampaignSchema = z.object({
  name: z.string().min(1),
  brandId: z.string(),
  productImageIds: z.array(z.string()).optional().default([]),
});

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  return NextResponse.json(campaigns);
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validatedData = createCampaignSchema.parse(body);

    // Verify brand ownership
    const brand = await prisma.brand.findFirst({
      where: {
        id: validatedData.brandId,
        userId: session.user.id,
      },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const campaign = await prisma.campaign.create({
      data: {
        ...validatedData,
        userId: session.user.id,
      },
      include: {
        brand: true,
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
