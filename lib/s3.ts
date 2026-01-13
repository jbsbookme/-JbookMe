export async function uploadFile(): Promise<never> {
  throw new Error('AWS S3 has been removed. Use Vercel Blob upload endpoints instead.');
}

export async function getFileUrl(): Promise<never> {
  throw new Error('AWS S3 has been removed. Store and use public Blob URLs instead.');
}

export async function deleteFile(): Promise<never> {
  throw new Error('AWS S3 has been removed. Use Vercel Blob delete (del) if needed.');
}

export async function renameFile(): Promise<never> {
  throw new Error('AWS S3 has been removed.');
}
