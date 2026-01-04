import { S3Client } from '@aws-sdk/client-s3';

// Get bucket configuration from environment variables
export function getBucketConfig() {
  const bucketName = process.env.AWS_BUCKET_NAME;
  const folderPrefix = process.env.AWS_FOLDER_PREFIX || '';

  if (!bucketName) {
    throw new Error('AWS_BUCKET_NAME is not configured');
  }

  return {
    bucketName,
    folderPrefix,
  };
}

// Create and configure S3 client
export function createS3Client(): S3Client {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
  if (!region) {
    throw new Error('AWS region is not configured (set AWS_REGION)');
  }

  return new S3Client({ region });
}
