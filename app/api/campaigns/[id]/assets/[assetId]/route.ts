import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadImageToS3, deleteFromS3 } from '@/lib/s3';

interface RouteContext {
  params: Promise<{
    id: string;
    assetId: string;
  }>;
}

// GET /api/campaigns/[id]/assets/[assetId]
export async function GET(request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: campaignId, assetId } = await context.params;

    // Verify campaign ownership and get asset
    const asset = await prisma.generatedAsset.findFirst({
      where: {
        id: assetId,
        campaignId,
        campaign: {
          userId: session.user.id,
        },
      },
      include: {
        campaign: true,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json(asset);
  } catch (error) {
    console.error('Error fetching asset:', error);
    return NextResponse.json({ error: 'Failed to fetch asset' }, { status: 500 });
  }
}

// PUT /api/campaigns/[id]/assets/[assetId]
export async function PUT(request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: campaignId, assetId } = await context.params;
    const { canvasState, thumbnailDataUrl } = await request.json();

    // Verify campaign ownership
    const asset = await prisma.generatedAsset.findFirst({
      where: {
        id: assetId,
        campaignId,
        campaign: {
          userId: session.user.id,
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // If a rendered thumbnail was provided, upload it and update s3Url
    let newS3Url = asset.s3Url;
    let newS3Key = asset.s3Key;

    if (thumbnailDataUrl) {
      try {
        // Extract base64 data from data URL (e.g., "data:image/png;base64,...")
        const base64Data = thumbnailDataUrl.split(',')[1];
        if (base64Data) {
          const s3Key = `generated/${campaignId}/${Date.now()}-${asset.aspectRatio.replace(':', 'x')}-edited.png`;
          newS3Url = await uploadImageToS3(base64Data, s3Key, 'image/png');
          newS3Key = s3Key;
        }
      } catch (error) {
        console.error('Error uploading thumbnail:', error);
        // Continue saving canvas state even if thumbnail upload fails
      }
    }

    // Update canvas state and thumbnail URL
    const updated = await prisma.generatedAsset.update({
      where: { id: assetId },
      data: {
        canvasState,
        s3Url: newS3Url,
        s3Key: newS3Key,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating asset:', error);
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 });
  }
}

// DELETE /api/campaigns/[id]/assets/[assetId]
export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: campaignId, assetId } = await context.params;

    // Verify campaign ownership
    const asset = await prisma.generatedAsset.findFirst({
      where: {
        id: assetId,
        campaignId,
        campaign: {
          userId: session.user.id,
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Delete from S3 if there's an S3 key
    if (asset.s3Key) {
      try {
        await deleteFromS3(asset.s3Key);
      } catch (error) {
        console.error('Error deleting from S3:', error);
        // Continue with database deletion even if S3 deletion fails
      }
    }

    // Delete from database
    await prisma.generatedAsset.delete({
      where: { id: assetId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting asset:', error);
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  }
}
