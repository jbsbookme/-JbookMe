import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { put } from '@vercel/blob';
import { PostStatus, PostType, Role } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { isBarberOrAdmin } from '@/lib/auth/role-utils';
import { publishLinkToFacebookPage } from '@/lib/facebook';

// GET - Fetch posts (all approved for public, or user's own posts)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const authorId = searchParams.get('authorId');

    // Always hide soft-deleted posts
    let where: Prisma.PostWhereInput = { isActive: true };

    // If no session, only show approved posts
    if (!session) {
      where.status = 'APPROVED';
    } else {
      // If admin, can see all
      if (session.user.role === 'ADMIN') {
        if (status && (status === 'PENDING' || status === 'APPROVED' || status === 'REJECTED')) {
          where.status = status as PostStatus;
        }
      } else {
        // Regular users see approved posts or their own
        where = {
          isActive: true,
          OR: [
            { status: 'APPROVED' },
            { authorId: session.user.id }
          ]
        };
      }
    }

    if (authorId) {
      where.authorId = authorId;
    }

    const posts = await prisma.post.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true
          }
        },
        barber: {
          select: {
            id: true,
            profileImage: true,
            user: {
              select: {
                name: true,
                image: true
              }
            }
          }
        },
        comments: {
          include: {
            author: {
              select: {
                name: true,
                image: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            comments: true,
            likedBy: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

// POST - Create new post
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const caption = formData.get('caption') as string;
    const hashtagsRaw = formData.get('hashtags') as string;
    const barberId = formData.get('barberId') as string;
    const providedCloudPath = formData.get('cloud_storage_path') as string;

    console.log('[POST /api/posts] Received request:', {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      caption: caption?.substring(0, 50),
      hashtagsRaw,
      userId: session.user.id,
      userRole: session.user.role
    });

    const hasProvidedCloudPath = !!providedCloudPath && !!providedCloudPath.trim();

    if (!file && !hasProvidedCloudPath) {
      return NextResponse.json(
        { error: 'Media (photo or video) is required' },
        { status: 400 }
      );
    }

    // Caption is optional.

    if (file) {
      if (!file.type?.startsWith('image/') && !file.type?.startsWith('video/')) {
        return NextResponse.json(
          { error: 'Only images and videos are allowed' },
          { status: 400 }
        );
      }

      // 50MB max (keeps parity with /api/posts/upload)
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File is too large (max 50MB)' },
          { status: 400 }
        );
      }
    } else {
      const cloudPath = providedCloudPath.trim();

      const isHttpUrl = /^https?:\/\//i.test(cloudPath);
      const isSameOriginPath = cloudPath.startsWith('/');

      if (!isHttpUrl && !isSameOriginPath) {
        return NextResponse.json(
          {
            error: 'Unsupported cloud_storage_path. Expected a Blob URL or a same-origin public path.',
            code: 'UNSUPPORTED_CLOUD_PATH',
          },
          { status: 410 }
        );
      }
    }

    // Parse hashtags - could be JSON array or comma-separated string
    let hashtagsArray: string[] = [];
    if (hashtagsRaw) {
      try {
        hashtagsArray = JSON.parse(hashtagsRaw);
      } catch {
        hashtagsArray = hashtagsRaw.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      }
    }

    console.log('[POST /api/posts] Parsed hashtags:', hashtagsArray);

    // Determine post type first (needed for folder structure)
    const postType: PostType = isBarberOrAdmin(session.user.role) ? 'BARBER_WORK' : 'CLIENT_SHARE';

    // Create organized folder structure: posts/YYYY/MM/TYPE/
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const typeFolder = postType.toLowerCase(); // barber_work or client_share

    // If media is already uploaded (Blob flow), use providedCloudPath.
    // Otherwise upload here.
    let cloud_storage_path: string;
    if (hasProvidedCloudPath && !file) {
      cloud_storage_path = providedCloudPath.trim();
    } else {
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const key = `posts/${year}/${month}/${typeFolder}/${Date.now()}-${sanitizedFileName}`;
      console.log('[POST /api/posts] Uploading to Vercel Blob with key:', key);

      const blob = await put(key, file, {
        access: 'public',
        addRandomSuffix: false,
      });

      cloud_storage_path = blob.url;
      console.log('[POST /api/posts] Blob upload successful:', cloud_storage_path);
    }

    // Get barberId if user is a barber
    let finalBarberId = barberId;
    if (isBarberOrAdmin(session.user.role) && !barberId) {
      // If the author is a barber, find their barber record
      const barberRecord = await prisma.barber.findUnique({
        where: { userId: session.user.id },
        select: { id: true }
      });
      if (barberRecord) {
        finalBarberId = barberRecord.id;
      }
    }

    // Create post - Auto-approve all posts
    // Keep authorType as 'BARBER' for both BARBER and ADMIN (UI currently expects BARBER vs CLIENT).
    const authorType: Role = isBarberOrAdmin(session.user.role) ? 'BARBER' : 'CLIENT';
    
    console.log('[POST /api/posts] Creating post with cloud_storage_path:', cloud_storage_path);
    console.log('[POST /api/posts] File type:', file?.type);
    
    const post = await prisma.post.create({
      data: {
        authorId: session.user.id,
        authorType,
        postType,
        cloud_storage_path,
        caption: caption?.trim() ? caption.trim() : null,
        hashtags: hashtagsArray,
        barberId: finalBarberId || null,
        status: 'APPROVED' // Auto-approve - no moderation needed
      },
      include: {
        author: {
          select: {
            name: true,
            image: true
          }
        },
        barber: {
          select: {
            id: true,
            profileImage: true,
            user: {
              select: {
                name: true,
                image: true
              }
            }
          }
        }
      }
    });

    console.log('[POST /api/posts] Post created successfully:', post.id);

    // Optional: auto-publish to the barber shop Facebook Page (best effort).
    // This is controlled by env vars and will never block post creation.
    try {
      const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://www.jbsbookme.com';
      const publicLink = `${origin.replace(/\/$/, '')}/p/${post.id}`;
      const messageParts = [post.caption || '', ...(post.hashtags || [])]
        .map((s) => (typeof s === 'string' ? s.trim() : ''))
        .filter(Boolean);
      const message = messageParts.join('\n').slice(0, 1900);

      console.log('[POST /api/posts] Facebook publish start:', {
        postId: post.id,
        publicLink,
        messageLength: message.length,
        hasOriginEnv: !!process.env.NEXT_PUBLIC_APP_URL,
      });

      const fbResult = await publishLinkToFacebookPage({
        message: message || 'New post',
        link: publicLink,
      });

      console.log('[POST /api/posts] Facebook publish finished:', {
        postId: post.id,
        ok: fbResult.ok,
        id: fbResult.id,
        error: fbResult.ok ? undefined : fbResult.error,
      });

      if (!fbResult.ok) {
        console.log('[POST /api/posts] Facebook publish skipped/failed:', fbResult.error);
      } else {
        console.log('[POST /api/posts] Facebook publish ok:', fbResult.id);
      }
    } catch (error) {
      console.log('[POST /api/posts] Facebook publish unexpected error:', error);
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/posts] Error creating post:', error);
    const isProd = process.env.NODE_ENV === 'production';
    return NextResponse.json(
      {
        error: 'Failed to create post',
        code: 'POST_CREATE_FAILED',
        ...(isProd ? {} : { details: error instanceof Error ? error.message : 'Unknown error' }),
      },
      { status: 500 }
    );
  }
}
