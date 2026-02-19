import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteFromS3 } from '@/lib/s3';
import { z } from 'zod';

const updateBriefSchema = z.object({
  productName: z.string().optional(),
  targetRegion: z.string().optional(),
  language: z.string().optional(),
  audience: z.string().optional(),
  cta: z.string().optional(),
  message: z.string().optional(),
});

const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  brandId: z.string().optional(),
  productImageIds: z.array(z.string()).optional(),
  brief: updateBriefSchema.optional(),
});

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const validatedData = updateCampaignSchema.parse(body);

    // Verify campaign ownership
    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: { brief: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Build update data (brandId is set at creation and not updatable)
    const updateData: any = {};

    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name;
    }

    if (validatedData.productImageIds !== undefined) {
      updateData.productImageIds = validatedData.productImageIds;
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: updateData,
      include: {
        brand: true,
        brief: true,
      },
    });

    // Update or create brief if provided
    if (validatedData.brief && Object.keys(validatedData.brief).length > 0) {
      const briefData = {
        ...validatedData.brief,
        campaignName: updatedCampaign.name,
        brandName: updatedCampaign.brand.name,
      };

      if (campaign.brief) {
        // Update existing brief
        await prisma.brief.update({
          where: { campaignId: id },
          data: briefData,
        });
      } else {
        // Create new brief
        await prisma.brief.create({
          data: {
            ...briefData,
            campaignId: id,
          },
        });
      }
    }

    // Fetch updated campaign with brief
    const finalCampaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        brand: true,
        brief: true,
      },
    });

    return NextResponse.json(finalCampaign);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/[id]
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    // Verify campaign ownership
    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        generatedAssets: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Delete S3 assets
    for (const asset of campaign.generatedAssets) {
      if (asset.s3Key) {
        try {
          await deleteFromS3(asset.s3Key);
        } catch (error) {
          console.error('Error deleting S3 asset:', error);
        }
      }
    }

    // Delete campaign (cascades to brief, assets, jobs)
    await prisma.campaign.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
