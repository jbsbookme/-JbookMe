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
  return new S3Client({});
}
