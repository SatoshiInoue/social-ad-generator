import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BUCKET_NAME = process.env.AWS_S3_BUCKET || '';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

function getS3Url(key: string): string {
  return `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
}

async function fixS3Urls() {
  try {
    console.log('🔍 Finding media assets with incorrect S3 URLs...\n');

    const assets = await prisma.mediaAsset.findMany({
      select: {
        id: true,
        fileName: true,
        s3Key: true,
        s3Url: true,
        thumbnailUrl: true,
      },
    });

    console.log(`📦 Found ${assets.length} media assets\n`);

    let updatedCount = 0;

    for (const asset of assets) {
      const correctUrl = getS3Url(asset.s3Key);
      const correctThumbnailUrl = asset.thumbnailUrl
        ? getS3Url(asset.thumbnailUrl.split('/').pop() || '')
        : null;

      if (asset.s3Url !== correctUrl) {
        console.log(`Updating: ${asset.fileName}`);
        console.log(`  Old URL: ${asset.s3Url}`);
        console.log(`  New URL: ${correctUrl}`);

        await prisma.mediaAsset.update({
          where: { id: asset.id },
          data: {
            s3Url: correctUrl,
            thumbnailUrl: correctThumbnailUrl,
          },
        });

        updatedCount++;
        console.log('  ✅ Updated\n');
      }
    }

    console.log(`\n✨ Fixed ${updatedCount} media asset(s)`);
    console.log(`📍 Region: ${AWS_REGION}`);
    console.log(`🪣 Bucket: ${BUCKET_NAME}`);
  } catch (error) {
    console.error('❌ Error fixing S3 URLs:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixS3Urls();
