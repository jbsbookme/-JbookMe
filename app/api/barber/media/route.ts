import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { put } from '@vercel/blob';
import { isBarberOrAdmin } from '@/lib/auth/role-utils';

// GET /api/barber/media - Get barber's media gallery
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const barberId = searchParams.get('barberId');

    // If barberId is provided (public view), anyone can see
    if (barberId) {
      const mediaRecords = await prisma.barberMedia.findMany({
        where: {
          barberId,
          isActive: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Generate URLs for each media item
      const mediaWithUrls = mediaRecords.map((media) => ({
        ...media,
        mediaUrl: media.cloud_storage_path,
      }));

      return NextResponse.json(mediaWithUrls);
    }

    // Otherwise, require barber authentication
    const session = await getServerSession(authOptions);

    if (!session || !isBarberOrAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only barbers can view their gallery.' },
        { status: 401 }
      );
    }

    // Find the barber record
    const barber = await prisma.barber.findUnique({
      where: { userId: session.user.id },
      include: {
        media: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!barber) {
      return NextResponse.json(
        { error: 'Barber profile not found.' },
        { status: 404 }
      );
    }

    // Generate URLs for each media item
    const mediaWithUrls = barber.media.map((media) => ({
      ...media,
      mediaUrl: media.cloud_storage_path,
    }));

    return NextResponse.json(mediaWithUrls);
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gallery.' },
      { status: 500 }
    );
  }
}

// POST /api/barber/media - Add new media to gallery (with file upload)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !isBarberOrAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only barbers can add media.' },
        { status: 401 }
      );
    }

    // Parse FormData
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const mediaType = formData.get('mediaType') as string;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required.' },
        { status: 400 }
      );
    }

    if (!mediaType) {
      return NextResponse.json(
        { error: 'Media type is required.' },
        { status: 400 }
      );
    }

    // Validate mediaType
    if (mediaType !== 'PHOTO' && mediaType !== 'VIDEO') {
      return NextResponse.json(
        { error: 'Invalid media type. Must be PHOTO or VIDEO.' },
        { status: 400 }
      );
    }

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];
    const validVideoTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'];
    
    if (mediaType === 'PHOTO' && !validImageTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed (JPEG, PNG, WebP, GIF).' },
        { status: 400 }
      );
    }

    if (mediaType === 'VIDEO' && !validVideoTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only videos are allowed (MP4, MPEG, MOV, WebM).' },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB for images, 100MB for videos)
    const maxSizeImage = 50 * 1024 * 1024; // 50MB
    const maxSizeVideo = 100 * 1024 * 1024; // 100MB
    
    if (mediaType === 'PHOTO' && file.size > maxSizeImage) {
      return NextResponse.json(
        { error: 'Image is too large. Maximum size is 50MB.' },
        { status: 400 }
      );
    }

    if (mediaType === 'VIDEO' && file.size > maxSizeVideo) {
      return NextResponse.json(
        { error: 'Video is too large. Maximum size is 100MB.' },
        { status: 400 }
      );
    }

    // Find the barber record
    const barber = await prisma.barber.findUnique({
      where: { userId: session.user.id },
    });

    if (!barber) {
      return NextResponse.json(
        { error: 'Barber profile not found.' },
        { status: 404 }
      );
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobPath = `barber-media/${barber.id}/${year}/${month}/${timestamp}-${sanitizedFileName}`;

    const blob = await put(blobPath, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    // Create media record
    const media = await prisma.barberMedia.create({
      data: {
        barberId: barber.id,
        cloud_storage_path: blob.url,
        isPublic: true,
        mediaType,
        title: title || null,
        description: description || null,
      },
    });

    const mediaUrl = blob.url;

    return NextResponse.json(
      {
        message: 'Media added successfully.',
        media: {
          ...media,
          mediaUrl,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding media:', error);
    return NextResponse.json(
      { error: 'Failed to add media.' },
      { status: 500 }
    );
  }
}
