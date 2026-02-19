import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { exportToPsd } from '@/lib/psd-export';
import { uploadBufferToS3 } from '@/lib/s3';
import { getDimensionsFromAspectRatio } from '@/lib/canvas-renderer';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { assetId, format, quality } = await request.json();

    // Validate format
    if (!['png', 'jpeg', 'psd'].includes(format)) {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }

    // Get asset with campaign to verify ownership
    const asset = await prisma.generatedAsset.findFirst({
      where: {
        id: assetId,
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

    // For PNG and JPEG, return the existing s3Url (already rendered)
    if (format === 'png' || format === 'jpeg') {
      return NextResponse.json({
        url: asset.s3Url,
        format,
      });
    }

    // For PSD, generate from canvas state
    if (format === 'psd') {
      if (!asset.canvasState) {
        return NextResponse.json(
          { error: 'No canvas state available for PSD export' },
          { status: 400 }
        );
      }

      // Get dimensions from aspect ratio
      const dimensions = getDimensionsFromAspectRatio(asset.aspectRatio);

      // Generate PSD
      const psdBuffer = await exportToPsd({
        canvasState: asset.canvasState as any,
        width: dimensions.width,
        height: dimensions.height,
      });

      // Upload to S3
      const s3Key = `exports/${asset.campaignId}/${Date.now()}-${asset.aspectRatio.replace(':', 'x')}.psd`;
      const s3Url = await uploadBufferToS3(psdBuffer, s3Key, 'application/x-photoshop');

      return NextResponse.json({
        url: s3Url,
        format: 'psd',
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export asset' },
      { status: 500 }
    );
  }
}
