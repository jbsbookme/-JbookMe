import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    {
      error: 'S3 presigned uploads are no longer supported. This app uses Vercel Blob only.',
      hint: 'Use /api/posts/upload-blob (recommended) or /api/posts/upload which returns a Blob URL.',
    },
    { status: 410 }
  );
}
