import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { put } from '@vercel/blob';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has ADMIN, BARBER, or STYLIST role
    const userRole = session.user.role;
    if (userRole !== 'ADMIN' && userRole !== 'BARBER' && userRole !== 'STYLIST') {
      return NextResponse.json(
        { error: 'Forbidden - Only ADMIN, BARBER, and STYLIST roles can upload images' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate it is an image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image must not exceed 10MB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const fileName = `gallery/${timestamp}.${ext}`;

    // Upload to Vercel Blob (public)
    const blob = await put(fileName, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    // NOTE: This endpoint only uploads and returns the URL.
    // Persisting the image metadata is handled by POST /api/gallery.
    return NextResponse.json(
      {
        message: 'Image uploaded successfully',
        cloud_storage_path: blob.url,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
