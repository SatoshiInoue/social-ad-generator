import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import sharp from 'sharp';
import {
  generateBackground,
  generatePromptFromBrief,
  removeBackground,
  generateAdWithProduct,
  generateAdCopy,
  ProductImageData
} from '@/lib/nanobanana';
import { checkCompliance } from '@/lib/compliance';
import { uploadImageToS3, uploadBufferToS3, getS3Url } from '@/lib/s3';
import {
  generateInitialCanvasState,
  generateHeadlineText,
  generateCTAText,
} from '@/lib/canvas-state';
import {
  renderCanvasState,
  getDimensionsFromAspectRatio,
} from '@/lib/canvas-renderer';

/**
 * Post-process a generated image to ensure it exactly fills the target dimensions.
 * Uses sharp's cover strategy: resize to fill, then crop from center.
 * This fixes two Gemini limitations:
 * 1. White bars / blank space on non-1:1 aspect ratios
 * 2. Product stretching (Gemini tries to stretch to fill, cover-crop doesn't stretch)
 */
/**
 * Analyze average brightness of a horizontal region of the image.
 * Returns true if the region is light (brightness > 128).
 */
async function analyzeRegionBrightness(
  base64ImageData: string,
  imgWidth: number,
  imgHeight: number,
  topPercent: number,
  heightPercent: number
): Promise<boolean> {
  const buffer = Buffer.from(base64ImageData, 'base64');
  const top = Math.round(imgHeight * topPercent);
  const regionHeight = Math.round(imgHeight * heightPercent);

  const stats = await sharp(buffer)
    .extract({
      left: 0,
      top: Math.min(top, imgHeight - 1),
      width: imgWidth,
      height: Math.min(regionHeight, imgHeight - top),
    })
    .stats();

  // Average brightness from R, G, B channel means
  const avgBrightness =
    (stats.channels[0].mean + stats.channels[1].mean + stats.channels[2].mean) / 3;

  return avgBrightness > 128;
}

/**
 * Post-process a generated image to ensure it exactly fills the target dimensions.
 */
async function postProcessImage(
  base64ImageData: string,
  targetWidth: number,
  targetHeight: number
): Promise<string> {
  const inputBuffer = Buffer.from(base64ImageData, 'base64');

  const outputBuffer = await sharp(inputBuffer)
    .resize(targetWidth, targetHeight, {
      fit: 'cover',
      position: 'centre',
    })
    .png()
    .toBuffer();

  return outputBuffer.toString('base64');
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { campaignId, aspectRatios = ['1:1', '9:16', '16:9'] } = await request.json();

    // Get campaign with brand and brief
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        userId: session.user.id,
      },
      include: {
        brand: true,
        brief: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (!campaign.brief) {
      return NextResponse.json(
        { error: 'Campaign must have a brief' },
        { status: 400 }
      );
    }

    // Create generation job
    const job = await prisma.generationJob.create({
      data: {
        campaignId,
        status: 'PENDING',
        progress: 0,
        config: {
          aspectRatios,
        },
      },
    });

    // Start generation process (async)
    processGeneration(job.id, campaign, aspectRatios).catch(async (error) => {
      console.error('Generation error:', error);
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          error: error.message,
        },
      });
    });

    return NextResponse.json({ jobId: job.id }, { status: 202 });
  } catch (error) {
    console.error('Error starting generation:', error);
    return NextResponse.json(
      { error: 'Failed to start generation' },
      { status: 500 }
    );
  }
}

async function processGeneration(
  jobId: string,
  campaign: any,
  aspectRatios: string[]
) {
  try {
    // Update status to processing
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING', progress: 10 },
    });

    // Fetch and process product images if they exist
    const productImages: ProductImageData[] = [];
    const productImageUrls: string[] = [];

    if (campaign.productImageIds && campaign.productImageIds.length > 0) {
      console.log('Loading product images:', campaign.productImageIds);

      const mediaAssets = await prisma.mediaAsset.findMany({
        where: { id: { in: campaign.productImageIds } },
      });

      for (const asset of mediaAssets) {
        try {
          // Download product image from S3
          const response = await fetch(asset.s3Url);
          if (!response.ok) {
            console.error('Failed to fetch product image:', asset.s3Url);
            continue;
          }

          const buffer = await response.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const mimeType = asset.fileType || 'image/png';

          // Remove background from product image
          console.log('Removing background from product image:', asset.fileName);
          const bgRemoved = await removeBackground(base64, mimeType);

          // Upload background-removed image to S3 for use in canvas state
          const bgRemovedKey = `generated/${campaign.id}/product-${asset.id}-nobg.png`;
          const bgRemovedUrl = await uploadImageToS3(
            bgRemoved.imageData,
            bgRemovedKey,
            bgRemoved.mimeType
          );

          productImages.push({
            base64: bgRemoved.imageData,
            mimeType: bgRemoved.mimeType,
          });

          productImageUrls.push(bgRemovedUrl);
        } catch (error) {
          console.error('Error processing product image:', asset.fileName, error);
          // Continue with other images even if one fails
        }
      }

      console.log(`Processed ${productImages.length} product images`);
    }

    // Generate prompt from brief
    const prompt = await generatePromptFromBrief({
      brandName: campaign.brand.name,
      productName: campaign.brief.productName,
      message: campaign.brief.message,
      audience: campaign.brief.audience,
      tone: campaign.brand.tone,
      style: campaign.brand.style,
      hasProductImages: productImages.length > 0,
    });

    await prisma.generationJob.update({
      where: { id: jobId },
      data: { progress: 20 },
    });

    // Generate assets for each aspect ratio
    const totalRatios = aspectRatios.length;
    for (let i = 0; i < aspectRatios.length; i++) {
      const ratio = aspectRatios[i];

      // Generate image - with product if available, otherwise just background
      let generatedImage;
      if (productImages.length > 0) {
        console.log(`Generating ad with product for ${ratio}`);
        generatedImage = await generateAdWithProduct({
          prompt,
          aspectRatio: ratio,
          style: campaign.brand.style,
          productImages,
          productName: campaign.brief.productName,
        });
      } else {
        console.log(`Generating background only for ${ratio}`);
        generatedImage = await generateBackground({
          prompt,
          aspectRatio: ratio,
          style: campaign.brand.style,
        });
      }

      // Post-process: crop/resize to exact target dimensions (fixes white bars + stretching)
      const targetDims = getDimensionsFromAspectRatio(ratio);
      const processedImageData = await postProcessImage(
        generatedImage.imageData,
        targetDims.width,
        targetDims.height
      );
      console.log(`Post-processed image for ${ratio}: ${targetDims.width}x${targetDims.height}`);

      // Upload generated image to S3 (used in canvas state as background)
      const backgroundKey = `generated/${campaign.id}/${Date.now()}-${ratio.replace(':', 'x')}-bg.png`;
      const backgroundUrl = await uploadImageToS3(
        processedImageData,
        backgroundKey,
        'image/png'
      );

      // Generate AI-powered ad copy (headline and CTA)
      let headline: string;
      let cta: string;
      try {
        const copy = await generateAdCopy({
          brandName: campaign.brand.name,
          productName: campaign.brief.productName,
          message: campaign.brief.message,
          audience: campaign.brief.audience,
          cta: campaign.brief.cta,
          language: campaign.brief.language,
        });
        headline = copy.headline;
        cta = copy.cta;
        console.log('AI-generated copy:', { headline, cta });
      } catch (error) {
        console.error('AI copywriting failed, using fallback:', error);
        headline = generateHeadlineText(
          campaign.brief.productName,
          campaign.brief.campaignName,
          campaign.brief.message
        );
        cta = generateCTAText(campaign.brief.cta);
      }

      // Extract brand colors from brand palette
      const brandColors = campaign.brand.colorPalette
        ? Array.isArray(campaign.brand.colorPalette)
          ? (campaign.brand.colorPalette as string[])
          : []
        : [];

      // Analyze background brightness in text regions for contrast adjustment
      const [headlineLight, ctaLight] = await Promise.all([
        analyzeRegionBrightness(processedImageData, targetDims.width, targetDims.height, 0.10, 0.25),
        analyzeRegionBrightness(processedImageData, targetDims.width, targetDims.height, 0.75, 0.20),
      ]);
      console.log(`Background brightness - headline region: ${headlineLight ? 'light' : 'dark'}, CTA region: ${ctaLight ? 'light' : 'dark'}`);

      // Generate complete canvas state with text layers and logo
      const canvasState = generateInitialCanvasState({
        aspectRatio: ratio,
        backgroundImageUrl: backgroundUrl,
        brandLogoUrl: campaign.brand.logoUrl || undefined,
        headline,
        cta,
        brandColors,
        language: campaign.brief?.language,
        backgroundBrightness: { headlineLight, ctaLight },
      });

      // Render canvas state to create final composite image with text
      const dimensions = getDimensionsFromAspectRatio(ratio);
      const renderedImageBuffer = await renderCanvasState(canvasState, dimensions);

      // Upload rendered composite image to S3 (this is the final ad image)
      const s3Key = `generated/${campaign.id}/${Date.now()}-${ratio.replace(':', 'x')}.png`;
      const s3Url = await uploadBufferToS3(
        renderedImageBuffer,
        s3Key,
        'image/png'
      );

      // Create generated asset
      const generatedAsset = await prisma.generatedAsset.create({
        data: {
          campaignId: campaign.id,
          generationJobId: jobId,
          aspectRatio: ratio,
          language: campaign.brief.language || 'en',
          s3Key,
          s3Url,
          canvasState: canvasState as Prisma.InputJsonValue,
        },
      });

      // Auto-score compliance (non-blocking)
      runComplianceScore(generatedAsset.id, canvasState, s3Url, campaign).catch((err) =>
        console.error('Auto compliance scoring failed:', err)
      );

      // Update progress
      const progress = 20 + Math.floor(((i + 1) / totalRatios) * 70);
      await prisma.generationJob.update({
        where: { id: jobId },
        data: { progress },
      });
    }

    // Mark as completed
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        progress: 100,
      },
    });

    // Update campaign status
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'GENERATED' },
    });
  } catch (error) {
    console.error('Generation process error:', error);
    throw error;
  }
}

/**
 * Run compliance scoring for a generated asset (non-blocking)
 */
async function runComplianceScore(
  assetId: string,
  canvasState: any,
  imageUrl: string,
  campaign: any
) {
  const objects = canvasState?.objects || [];
  const textLayers = objects
    .filter((l: any) => l.layerType === 'text' || l.type === 'textbox')
    .map((l: any) => ({ text: l.text || '' }));
  const hasLogo = objects.some((l: any) => l.layerType === 'logo');

  const result = await checkCompliance(
    {
      imageUrl,
      textLayers,
      hasLogo,
      dominantColors: (campaign.brand.colorPalette as string[]) || [],
    },
    {
      prohibitedTerms: campaign.brand.prohibitedTerms || [],
      colorPalette: (campaign.brand.colorPalette as string[]) || [],
      guidelines: campaign.brand.guidelines || undefined,
      logoUrl: campaign.brand.logoUrl || undefined,
    }
  );

  await prisma.complianceScore.upsert({
    where: { generatedAssetId: assetId },
    update: {
      score: result.totalScore,
      reasoning: result as any,
      prohibitedTerms: result.prohibitedTerms.score,
      colorCompliance: result.colorCompliance.score,
      guidelinesCompliance: result.guidelinesCompliance.score,
      logoPresence: result.logoPresence.score,
      textReadability: result.textReadability.score,
    },
    create: {
      generatedAssetId: assetId,
      score: result.totalScore,
      reasoning: result as any,
      prohibitedTerms: result.prohibitedTerms.score,
      colorCompliance: result.colorCompliance.score,
      guidelinesCompliance: result.guidelinesCompliance.score,
      logoPresence: result.logoPresence.score,
      textReadability: result.textReadability.score,
    },
  });

  console.log(`Compliance score for asset ${assetId}: ${result.totalScore}/100`);
}
