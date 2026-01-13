import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { handleUpload } from '@vercel/blob/client';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const result = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async () => {
      return {
        // Some mobile browsers provide an empty/unknown MIME type for videos.
        // Allow octet-stream so uploads don't fail purely due to missing content-type.
        allowedContentTypes: ['image/*', 'video/*', 'application/octet-stream'],
        // Allow larger videos from mobile devices.
        maximumSizeInBytes: 200 * 1024 * 1024,
        tokenPayload: JSON.stringify({
          userId: session.user.id,
          role: session.user.role,
        }),
      };
    },
    onUploadCompleted: async () => {
      // No-op. Post creation is handled by /api/posts after upload.
    },
  });

  return NextResponse.json(result);
}
