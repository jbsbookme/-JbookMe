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
  const s3Client = createS3Client();

  cachedContext = { s3Client, bucketName, folderPrefix, region };
  return cachedContext;
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
  isPublic = false
): Promise<string> {
  const { s3Client, bucketName, folderPrefix } = getS3Context();
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  // Generate S3 key based on public/private
  const key = isPublic
    ? `${folderPrefix}public/uploads/${timestamp}-${sanitizedFileName}`
    : `${folderPrefix}uploads/${timestamp}-${sanitizedFileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
  });

  await s3Client.send(command);
  return key;
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
