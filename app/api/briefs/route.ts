import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createBriefSchema = z.object({
  campaignId: z.string(),
  campaignName: z.string(),
  brandName: z.string(),
  cta: z.string().optional(),
  productName: z.string().optional(),
  targetRegion: z.string().optional(),
  language: z.string().optional(),
  audience: z.string().optional(),
  message: z.string().optional(),
  rawFileUrl: z.string().optional(),
  parsedData: z.any().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validatedData = createBriefSchema.parse(body);

    // Verify campaign ownership
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: validatedData.campaignId,
        userId: session.user.id,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const brief = await prisma.brief.create({
      data: validatedData,
    });

    return NextResponse.json(brief, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create brief' },
      { status: 500 }
    );
  }
}
