import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

// GET - Fetch post media as same-origin response (helps Web Share file sharing).
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        isPublic: true,
        authorId: true,
        cloud_storage_path: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (!post.isPublic) {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (session.user.role !== 'ADMIN' && session.user.id !== post.authorId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const path = post.cloud_storage_path;

    let sourceUrl: string;
    if (isHttpUrl(path)) {
      sourceUrl = path;
    } else if (path.startsWith('/')) {
      sourceUrl = new URL(path, request.url).toString();
    } else {
      return NextResponse.json(
        {
          error: 'Unsupported media path. Expected a Blob URL or same-origin public path.',
          code: 'UNSUPPORTED_MEDIA_PATH',
        },
        { status: 410 }
      );
    }

    // Forward Range requests for proper streaming support (especially on iOS/Safari).
    const range = request.headers.get('range');
    const upstream = await fetch(sourceUrl, {
      headers: range ? { range } : undefined,
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: 'Failed to fetch media' },
        { status: 502 }
      );
    }

    const headers = new Headers();

    const passthroughHeaders = [
      'content-type',
      'content-length',
      'accept-ranges',
      'content-range',
    ];

    for (const header of passthroughHeaders) {
      const value = upstream.headers.get(header);
      if (value) headers.set(header, value);
    }

    // Short cache for public media to reduce repeated downloads.
    // Private media is still protected by auth and should not be cached publicly.
    headers.set('cache-control', post.isPublic ? 'public, max-age=300' : 'private, max-age=0, no-store');

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    console.error('Error fetching post media:', error);
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }
}
