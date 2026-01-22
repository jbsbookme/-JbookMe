import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      error: 'Vercel Blob uploads are disabled. Posts media uploads are Cloudinary-only.',
      hint: 'Upload to Cloudinary (unsigned preset) and then create the post via /api/posts using JSON: { mediaUrl, caption }.',
      code: 'VERCEL_BLOB_DISABLED',
    },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      error: 'Vercel Blob uploads are disabled. Posts media uploads are Cloudinary-only.',
      hint: 'Upload to Cloudinary (unsigned preset) and then create the post via /api/posts using JSON: { mediaUrl, caption }.',
      code: 'VERCEL_BLOB_DISABLED',
    },
    { status: 410 }
  );
}
