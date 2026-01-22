import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Presigned uploads are not supported. Posts media uploads are Cloudinary-only.',
      hint: 'Upload directly to Cloudinary (unsigned preset) and then create the post via /api/posts using JSON: { mediaUrl, caption }.',
    },
    { status: 410 }
  );
}
