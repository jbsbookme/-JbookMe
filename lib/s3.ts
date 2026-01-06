import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client, getBucketConfig } from './aws-config';

// Get AWS region from bucket name or environment or use default
const extractRegionFromBucket = (name: string): string => {
  // Try to extract region from bucket name (e.g., "bucket-name-us-west-2")
  const regionMatch = name.match(/(us|eu|ap|sa|ca|me|af)-(north|south|east|west|central|southeast|northeast)-\d+/);
  return regionMatch ? regionMatch[0] : 'us-east-1';
};

type S3Context = {
  s3Client: ReturnType<typeof createS3Client>;
  bucketName: string;
  folderPrefix: string;
  region: string;
};

let cachedContext: S3Context | null = null;

function getS3Context(): S3Context {
  if (cachedContext) return cachedContext;

  const { bucketName, folderPrefix } = getBucketConfig();
  const region = process.env.AWS_REGION || extractRegionFromBucket(bucketName);
  // Ensure AWS SDK always has a region (required by @aws-sdk/client-s3)
  if (!process.env.AWS_REGION) {
    process.env.AWS_REGION = region;
  }
  const s3Client = createS3Client();

  cachedContext = { s3Client, bucketName, folderPrefix, region };
  return cachedContext;
}

function extractBucketRegionFromAwsError(error: unknown): string | null {
  const anyErr = error as any;
  const headerRegion = anyErr?.$metadata?.httpHeaders?.['x-amz-bucket-region'];
  if (typeof headerRegion === 'string' && headerRegion.trim()) {
    return headerRegion.trim();
  }

  const message = String(anyErr?.message || '');
  // Common AWS message pattern:
  // "The authorization header is malformed; the region 'us-east-1' is wrong; expecting 'us-west-2'"
  const expectingMatch = message.match(/expecting\s*'([a-z0-9-]+)'/i);
  if (expectingMatch?.[1]) return expectingMatch[1];

  const regionHintMatch = message.match(/x-amz-bucket-region\s*:?\s*([a-z0-9-]+)/i);
  if (regionHintMatch?.[1]) return regionHintMatch[1];

  return null;
}

/**
 * Upload a file to S3
 * @param buffer - File buffer
 * @param fileName - Original file name
 * @param isPublic - Whether file should be publicly accessible
 * @returns S3 key (cloud_storage_path)
 */
export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  isPublic = false,
  contentType?: string
): Promise<string> {
  const { s3Client, bucketName, folderPrefix, region } = getS3Context();
  const timestamp = Date.now();
  // Preserve folder paths (/) but sanitize other characters.
  // This lets callers pass keys like: "posts/2026/01/barber_work/123.jpg".
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._/-]/g, '_');

  // If a path is provided (contains '/'), assume caller already planned the folder structure.
  // Otherwise, prefix with a timestamp to avoid collisions.
  const relativeKey = sanitizedFileName.includes('/')
    ? sanitizedFileName.replace(/^\/+/, '')
    : `${timestamp}-${sanitizedFileName}`;
  
  // Generate S3 key based on public/private
  const key = isPublic
    ? `${folderPrefix}public/uploads/${relativeKey}`
    : `${folderPrefix}uploads/${relativeKey}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ...(contentType ? { ContentType: contentType } : {}),
  });

  try {
    await s3Client.send(command);
    return key;
  } catch (error) {
    const bucketRegion = extractBucketRegionFromAwsError(error);
    if (bucketRegion && bucketRegion !== region) {
      // Retry once with the bucket's real region.
      process.env.AWS_REGION = bucketRegion;
      const retryClient = createS3Client();
      await retryClient.send(command);

      cachedContext = {
        s3Client: retryClient,
        bucketName,
        folderPrefix,
        region: bucketRegion,
      };
      return key;
    }
    throw error;
  }
}

/**
 * Get file URL from S3
 * @param cloud_storage_path - S3 key
 * @param isPublic - Whether file is public
 * @returns File URL
 */
export async function getFileUrl(
  cloud_storage_path: string,
  isPublic: boolean
): Promise<string> {
  const { s3Client, bucketName, region } = getS3Context();
  if (isPublic) {
    // Return public URL
    return `https://${bucketName}.s3.${region}.amazonaws.com/${cloud_storage_path}`;
  } else {
    // Generate signed URL with 1 hour expiry
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: cloud_storage_path,
    });
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  }
}

/**
 * Delete a file from S3
 * @param key - S3 key to delete
 */
export async function deleteFile(key: string): Promise<void> {
  const { s3Client, bucketName } = getS3Context();
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  await s3Client.send(command);
}

/**
 * Rename a file in S3 (copy and delete)
 * @param oldKey - Current S3 key
 * @param newKey - New S3 key
 */
export async function renameFile(_oldKey: string, _newKey: string): Promise<void> {
  // Note: S3 doesn't have a native rename operation
  // You would need to copy the object and then delete the old one
  // For simplicity, we'll just return the same key
  // Implement copy logic if needed in the future
  throw new Error('Rename not implemented. Use uploadFile with new name instead.');
}
