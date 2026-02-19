import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/campaigns/[id]/copy
export async function POST(request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;

    // Get source campaign with all relations
    const sourceCampaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        brief: true,
        brand: true,
      },
    });

    if (!sourceCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Create new campaign (copy name with "Copy" suffix)
    const newCampaign = await prisma.campaign.create({
      data: {
        name: `${sourceCampaign.name} (Copy)`,
        userId: session.user.id,
        brandId: sourceCampaign.brandId,
        productImageIds: sourceCampaign.productImageIds,
        status: 'DRAFT',
        // Copy brief if exists
        brief: sourceCampaign.brief
          ? {
              create: {
                campaignName: `${sourceCampaign.name} (Copy)`,
                brandName: sourceCampaign.brief.brandName,
                cta: sourceCampaign.brief.cta,
                productName: sourceCampaign.brief.productName,
                targetRegion: sourceCampaign.brief.targetRegion,
                language: sourceCampaign.brief.language,
                audience: sourceCampaign.brief.audience,
                message: sourceCampaign.brief.message,
                rawFileUrl: sourceCampaign.brief.rawFileUrl,
                parsedData: sourceCampaign.brief.parsedData ?? undefined,
              },
            }
          : undefined,
      },
      include: {
        brand: true,
        brief: true,
      },
    });

    return NextResponse.json(newCampaign);
  } catch (error) {
    console.error('Error copying campaign:', error);
    return NextResponse.json({ error: 'Failed to copy campaign' }, { status: 500 });
  }
}
