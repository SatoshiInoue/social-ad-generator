import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || '';

export interface PresignedUploadUrl {
  url: string;
  key: string;
  bucket: string;
}

export async function getPresignedUploadUrl(
  fileName: string,
  fileType: string,
  folder: string = 'uploads'
): Promise<PresignedUploadUrl> {
  const key = `${folder}/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return {
    url,
    key,
    bucket: BUCKET_NAME,
  };
}

export async function getPresignedDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

export function getS3Url(key: string): string {
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
}

/**
 * Upload base64 image data directly to S3
 */
export async function uploadImageToS3(
  base64Data: string,
  key: string,
  mimeType: string = 'image/png'
): Promise<string> {
  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ContentEncoding: 'base64',
    });

    await s3Client.send(command);

    return getS3Url(key);
  } catch (error) {
    console.error('Error uploading image to S3:', error);
    throw new Error('Failed to upload image to S3');
  }
}

/**
 * Upload buffer directly to S3
 */
export async function uploadBufferToS3(
  buffer: Buffer,
  key: string,
  mimeType: string = 'image/png'
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    });

    await s3Client.send(command);

    return getS3Url(key);
  } catch (error) {
    console.error('Error uploading buffer to S3:', error);
    throw new Error('Failed to upload buffer to S3');
  }
}

export { s3Client };
