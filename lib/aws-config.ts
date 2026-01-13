export function getBucketConfig(): never {
  throw new Error('AWS S3 has been removed. This app uses Vercel Blob only.');
}

export function createS3Client(): never {
  throw new Error('AWS S3 has been removed. This app uses Vercel Blob only.');
}
