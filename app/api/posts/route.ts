import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { uploadFile } from '@/lib/s3';
import { PostStatus, PostType, Role } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { isBarberOrStylist } from '@/lib/auth/role-utils';

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

    console.log('[POST /api/posts] Received request:', {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      caption: caption?.substring(0, 50),
      hashtagsRaw,
      userId: session.user.id,
      userRole: session.user.role
    });

    if (!file) {
      return NextResponse.json(
        { error: 'Media (photo or video) is required' },
        { status: 400 }
      );
    }

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
    const postType: PostType = isBarberOrStylist(session.user.role) ? 'BARBER_WORK' : 'CLIENT_SHARE';

    // Create organized folder structure: posts/YYYY/MM/TYPE/
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const typeFolder = postType.toLowerCase(); // barber_work or client_share

    // Save file locally or to S3
    let cloud_storage_path: string;
    
    try {
      // Try to upload to S3 first with organized path
      const buffer = Buffer.from(await file.arrayBuffer());
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const key = `posts/${year}/${month}/${typeFolder}/${Date.now()}-${sanitizedFileName}`;
      console.log('[POST /api/posts] Attempting S3 upload with key:', key);
      cloud_storage_path = await uploadFile(buffer, key, true, file.type || undefined);
      console.log('[POST /api/posts] S3 upload successful, path:', cloud_storage_path);
    } catch (s3Error) {
      // If S3 fails, save locally with organized structure
      console.log('[POST /api/posts] S3 upload failed, saving locally:', s3Error);
      
      const { writeFile, mkdir } = await import('fs/promises');
      const path = await import('path');
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Create organized directory: public/uploads/posts/YYYY/MM/TYPE/
      const uploadsDir = path.join(
        process.cwd(), 
        'public', 
        'uploads', 
        'posts',
        String(year),
        month,
        typeFolder
      );
      await mkdir(uploadsDir, { recursive: true });
      
      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${timestamp}-${sanitizedFileName}`;
      const filePath = path.join(uploadsDir, fileName);
      
      // Save file
      await writeFile(filePath, buffer);
      cloud_storage_path = `/uploads/posts/${year}/${month}/${typeFolder}/${fileName}`;
      console.log('[POST /api/posts] File saved locally:', cloud_storage_path);
    }

    // Get barberId if user is a barber
    let finalBarberId = barberId;
    if (isBarberOrStylist(session.user.role) && !barberId) {
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
    // Keep authorType as 'BARBER' for both BARBER and STYLIST (UI currently expects BARBER vs CLIENT).
    const authorType: Role = isBarberOrStylist(session.user.role) ? 'BARBER' : 'CLIENT';
    const post = await prisma.post.create({
      data: {
        authorId: session.user.id,
        authorType,
        postType,
        cloud_storage_path,
        caption: caption || null,
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

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/posts] Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
