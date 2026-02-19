import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkCompliance } from '@/lib/compliance';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { assetId } = await request.json();

    const asset = await prisma.generatedAsset.findFirst({
      where: { id: assetId },
      include: {
        campaign: {
          include: {
            brand: true,
          },
        },
      },
    });

    if (!asset || asset.campaign.userId !== session.user.id) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Extract data from asset canvas state (Fabric.js format uses 'objects' array)
    const canvasState = asset.canvasState as any;
    const objects = canvasState?.objects || [];
    const textLayers = objects.filter((l: any) => l.layerType === 'text' || (l.type || '').toLowerCase() === 'textbox');
    const hasLogo = objects.some((l: any) => l.layerType === 'logo' || ((l.type || '').toLowerCase() === 'image' && l.name === 'Logo'));

    // Run compliance check
    const result = await checkCompliance(
      {
        imageUrl: asset.s3Url,
        textLayers: textLayers.map((l: any) => ({ text: l.text || '' })),
        hasLogo,
        dominantColors: asset.campaign.brand.colorPalette as string[] || [],
      },
      {
        prohibitedTerms: asset.campaign.brand.prohibitedTerms,
        colorPalette: asset.campaign.brand.colorPalette as string[] || [],
        guidelines: asset.campaign.brand.guidelines || undefined,
        logoUrl: asset.campaign.brand.logoUrl || undefined,
      }
    );

    // Save compliance score
    const complianceScore = await prisma.complianceScore.upsert({
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

    return NextResponse.json(complianceScore);
  } catch (error) {
    console.error('Error checking compliance:', error);
    return NextResponse.json(
      { error: 'Failed to check compliance' },
      { status: 500 }
    );
  }
}
