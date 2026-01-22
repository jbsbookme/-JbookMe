import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { handleUpload } from '@vercel/blob/client';

export const runtime = 'nodejs';
export const maxDuration = 60;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(label)), ms)),
  ]);
}

export async function POST(request: NextRequest) {
  try {
    const session = await withTimeout(
      getServerSession(authOptions),
      20_000,
      'AUTH_TIMEOUT'
    );

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const pathname = typeof body?.pathname === 'string' ? body.pathname : '';
    if (!pathname) {
      return NextResponse.json({ error: 'Missing pathname' }, { status: 400 });
    }

    // Security: only allow uploads to known post folders.
    if (!pathname.startsWith('posts/')) {
      return NextResponse.json({ error: 'Invalid upload path' }, { status: 400 });
    }

    // Prevent path traversal or odd path formats.
    if (pathname.includes('..') || pathname.includes('\\')) {
      return NextResponse.json({ error: 'Invalid upload path' }, { status: 400 });
    }

    if (!/^posts\/(client_share|barber_work)\//.test(pathname)) {
      return NextResponse.json({ error: 'Invalid upload folder' }, { status: 400 });
    }

    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        return {
          // Some mobile browsers provide an empty/unknown MIME type for videos.
          // Allow octet-stream so uploads don't fail purely due to missing content-type.
          allowedContentTypes: ['image/*', 'video/*', 'application/octet-stream'],
          // Keep uploads lightweight (prevents huge videos).
          maximumSizeInBytes: 60 * 1024 * 1024,
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message === 'AUTH_TIMEOUT' ? 503 : 500;
    // Help debug client-token retrieval failures.
    console.error('[blob/upload] token generation failed:', message);
    return NextResponse.json(
      {
        error: message === 'AUTH_TIMEOUT' ? 'Auth timeout' : 'Upload token generation failed',
        code: message,
      },
      { status }
    );
  }
}
