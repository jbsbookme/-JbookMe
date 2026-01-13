import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { put } from '@vercel/blob';
import { isBarberOrAdmin } from '@/lib/auth/role-utils';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !isBarberOrAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
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

    // Convert to buffer
    // Upload to Vercel Blob (public) - production safe on Vercel.
    const timestamp = Date.now();
    const safeName = (file.name || 'profile').replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `profiles/barbers/${session.user.id}/${timestamp}-${safeName}`;

    const blob = await put(fileName, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    const imageUrl = blob.url;

    // Find barber record
    const barber = await prisma.barber.findFirst({
      where: { userId: session.user.id }
    });

    if (!barber) {
      return NextResponse.json(
        { error: 'Barber profile not found' },
        { status: 404 }
      );
    }

    // Update barber profile photo
    await prisma.$transaction([
      prisma.barber.update({
        where: { id: barber.id },
        data: { profileImage: imageUrl },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { image: imageUrl },
      }),
    ]);

    return NextResponse.json(
      { 
        imageUrl,
        message: 'Profile photo updated successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error uploading barber profile image:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload image',
        message: 'Failed to upload image',
      },
      { status: 500 }
    );
  }
}