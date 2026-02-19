import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { translateMultipleTexts } from '@/lib/localization';
import { renderCanvasState, getDimensionsFromAspectRatio } from '@/lib/canvas-renderer';
import { uploadBufferToS3 } from '@/lib/s3';

// Font families for non-Latin scripts
const LANGUAGE_FONTS: Record<string, string> = {
  ja: 'Noto Sans JP, Arial, sans-serif',
  ko: 'Noto Sans KR, Arial, sans-serif',
  zh: 'Noto Sans SC, Arial, sans-serif',
  ar: 'Noto Sans Arabic, Arial, sans-serif',
  hi: 'Noto Sans Devanagari, Arial, sans-serif',
};

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { assetId, targetLanguage } = await request.json();

    // Get the asset with campaign details
    const asset = await prisma.generatedAsset.findFirst({
      where: { id: assetId },
      include: {
        campaign: {
          include: {
            brand: true,
            brief: true,
          },
        },
      },
    });

    if (!asset || asset.campaign.userId !== session.user.id) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Extract text layers from canvas state (Fabric.js uses 'objects' array)
    const canvasState = asset.canvasState as any;
    const objects = canvasState?.objects || [];
    const textLayerIndices: number[] = [];
    const texts: string[] = [];

    objects.forEach((obj: any, index: number) => {
      const objType = (obj.type || '').toLowerCase();
      if ((obj.layerType === 'text' || objType === 'textbox') && obj.text) {
        textLayerIndices.push(index);
        texts.push(obj.text);
      }
    });

    if (texts.length === 0) {
      return NextResponse.json(
        { error: 'No text to translate' },
        { status: 400 }
      );
    }

    // Translate all text layers
    const translations = await translateMultipleTexts(
      texts,
      targetLanguage,
      {
        brandName: asset.campaign.brand.name,
        productName: asset.campaign.brief?.productName || undefined,
      }
    );

    // Create new canvas state with translated text and appropriate font
    const targetFont = LANGUAGE_FONTS[targetLanguage] || 'Arial, sans-serif';
    const translatedObjects = objects.map((obj: any, index: number) => {
      const textIdx = textLayerIndices.indexOf(index);
      if (textIdx !== -1) {
        return {
          ...obj,
          text: translations[textIdx],
          fontFamily: targetFont,
        };
      }
      return obj;
    });

    const translatedCanvasState = {
      ...canvasState,
      objects: translatedObjects,
    };

    // Render the translated canvas state to a new image
    const dimensions = getDimensionsFromAspectRatio(asset.aspectRatio);
    const renderedBuffer = await renderCanvasState(translatedCanvasState, dimensions);

    // Upload rendered image to S3
    const translatedS3Key = `generated/${asset.campaignId}/${Date.now()}-${asset.aspectRatio.replace(':', 'x')}-${targetLanguage}.png`;
    const translatedS3Url = await uploadBufferToS3(renderedBuffer, translatedS3Key, 'image/png');

    // Create new asset with translated content
    const translatedAsset = await prisma.generatedAsset.create({
      data: {
        campaignId: asset.campaignId,
        generationJobId: asset.generationJobId,
        aspectRatio: asset.aspectRatio,
        language: targetLanguage,
        s3Key: translatedS3Key,
        s3Url: translatedS3Url,
        canvasState: translatedCanvasState as any,
      },
    });

    return NextResponse.json(translatedAsset);
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Failed to translate asset' },
      { status: 500 }
    );
  }
}
