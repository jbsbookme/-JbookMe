import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { PostStatus, PostType, Role } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { isBarberOrAdmin } from '@/lib/auth/role-utils';
import { publishLinkToFacebookPage } from '@/lib/facebook';
import { uploadToCloudinary } from '@/lib/cloudinary-upload';

function getExtLower(name: string): string {
  const trimmed = (name || '').trim();
  const idx = trimmed.lastIndexOf('.');
  if (idx <= 0 || idx === trimmed.length - 1) return '';
  return trimmed.slice(idx + 1).toLowerCase();
}

function isCloudinaryUrl(url: string): boolean {
  const u = (url || '').trim();
  if (!u) return false;
  if (!/^https?:\/\//i.test(u)) return false;
  return /(^https?:\/\/res\.cloudinary\.com\/)|(^https?:\/\/.*\.cloudinary\.com\/)/i.test(u);
}

function isAllowedImage(file: File): boolean {
  const type = String((file as any)?.type || '').toLowerCase();
  if (type.startsWith('image/')) return true;
  const ext = getExtLower(String((file as any)?.name || ''));
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(ext);
}

function isAllowedVideo(file: File): boolean {
  const type = String((file as any)?.type || '').toLowerCase();
  if (type === 'video/mp4' || type === 'video/webm' || type === 'video/quicktime') return true;
  const ext = getExtLower(String((file as any)?.name || ''));
  return ['mp4', 'mov', 'webm'].includes(ext);
}

function inferMediaKind(file: File): 'image' | 'video' | null {
  if (isAllowedImage(file)) return 'image';
  if (isAllowedVideo(file)) return 'video';
  return null;
}

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

    const contentType = request.headers.get('content-type') || '';

    let file: File | null = null;
    let caption: string | undefined;
    let hashtagsRaw: string | undefined;
    let hashtagsJson: unknown;
    let barberId: string | undefined;
    let providedCloudPath: string | undefined;

    if (contentType.includes('application/json')) {
      const body = (await request.json().catch(() => null)) as any;
      caption = typeof body?.caption === 'string' ? body.caption : undefined;
      hashtagsRaw = typeof body?.hashtags === 'string' ? body.hashtags : undefined;
      hashtagsJson = body?.hashtags;
      barberId = typeof body?.barberId === 'string' ? body.barberId : undefined;
      const urlCandidate =
        (typeof body?.mediaUrl === 'string' ? body.mediaUrl : undefined) ||
        (typeof body?.media_url === 'string' ? body.media_url : undefined) ||
        (typeof body?.cloud_storage_path === 'string' ? body.cloud_storage_path : undefined);
      providedCloudPath = typeof urlCandidate === 'string' ? urlCandidate : undefined;
      file = null;
    } else {
      const formData = await request.formData();
      file = (formData.get('file') as File) || null;
      caption = (formData.get('caption') as string) || undefined;
      hashtagsRaw = (formData.get('hashtags') as string) || undefined;
      barberId = (formData.get('barberId') as string) || undefined;
      const urlCandidate =
        (formData.get('mediaUrl') as string) ||
        (formData.get('media_url') as string) ||
        (formData.get('cloud_storage_path') as string) ||
        undefined;
      providedCloudPath = urlCandidate;
    }

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
      const kind = inferMediaKind(file);
      if (!kind) {
        return NextResponse.json(
          {
            error: 'Unsupported media. Allowed: images (jpg/png/webp/heic) and videos (mp4/mov/webm).',
            code: 'UNSUPPORTED_MEDIA',
          },
          { status: 400 }
        );
      }

      const maxImageBytes = 20 * 1024 * 1024; // 20MB
      const maxVideoBytes = 100 * 1024 * 1024; // 100MB
      const maxBytes = kind === 'video' ? maxVideoBytes : maxImageBytes;

      if (file.size > maxBytes) {
        return NextResponse.json(
          {
            error: `File is too large (max ${kind === 'video' ? '100MB' : '20MB'})`,
            code: 'FILE_TOO_LARGE',
          },
          { status: 400 }
        );
      }
    }

    if (!file && hasProvidedCloudPath) {
      const cloudPath = String(providedCloudPath || '').trim();
      if (!isCloudinaryUrl(cloudPath)) {
        return NextResponse.json(
          {
            error: 'Unsupported mediaUrl. Cloudinary URL is required.',
            code: 'UNSUPPORTED_MEDIA_URL',
          },
          { status: 400 }
        );
      }
    }

    // Parse hashtags - could be JSON array (from JSON body) or a string (JSON array or comma-separated)
    let hashtagsArray: string[] = [];
    if (Array.isArray(hashtagsJson)) {
      hashtagsArray = (hashtagsJson as unknown[])
        .map((t) => (typeof t === 'string' ? t.trim() : ''))
        .filter(Boolean);
    } else if (hashtagsRaw) {
      try {
        hashtagsArray = JSON.parse(hashtagsRaw);
      } catch {
        hashtagsArray = hashtagsRaw
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
      }
    }

    console.log('[POST /api/posts] Parsed hashtags:', hashtagsArray);

    // Determine post type
    const postType: PostType = isBarberOrAdmin(session.user.role) ? 'BARBER_WORK' : 'CLIENT_SHARE';

    // Cloudinary-only media storage:
    // - if mediaUrl is provided, use it (validated as Cloudinary)
    // - if file is provided, upload to Cloudinary here (for FormData legacy clients)
    let cloud_storage_path: string;
    if (hasProvidedCloudPath && !file) {
      cloud_storage_path = String(providedCloudPath || '').trim();
    } else {
      if (!file) {
        return NextResponse.json(
          { error: 'Media (photo or video) is required' },
          { status: 400 }
        );
      }

      console.log('[POST /api/posts] Uploading media to Cloudinary (server-side)...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      try {
        const up = await uploadToCloudinary(file);
        cloud_storage_path = up.secureUrl;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json(
          {
            error: `Cloudinary upload failed. ${message}`,
            code: 'CLOUDINARY_UPLOAD_FAILED',
          },
          { status: 502 }
        );
      }
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

    // Notify admins so the business can quickly share the post without any social API permissions.
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      });

      if (admins.length > 0) {
        const shareLink = `/feed?post=${post.id}`;
        await prisma.notification.createMany({
          data: admins.map((u) => ({
            userId: u.id,
            type: 'POST_APPROVED',
            title: 'Listo para compartir / Ready to share',
            message: 'Abrí el post y compártelo en Facebook/Instagram/WhatsApp. / Open the post and share it to Facebook/Instagram/WhatsApp.',
            link: shareLink,
            postId: post.id,
          })),
        });
      }
    } catch (error) {
      console.log('[POST /api/posts] Admin share notification failed (non-blocking):', error);
    }

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
