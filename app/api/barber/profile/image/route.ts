import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { uploadFile, getFileUrl } from '@/lib/s3';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
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
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const fileName = `barber-profile-${session.user.id}-${timestamp}.${ext}`;

    let imageUrl: string;

    try {
      // Try uploading to S3 first
      console.log('[BARBER IMAGE] Attempting S3 upload...');
      const cloud_storage_path = await uploadFile(buffer, fileName, true);
      imageUrl = await getFileUrl(cloud_storage_path, true);
      console.log('[BARBER IMAGE] S3 upload successful:', imageUrl);
    } catch (s3Error) {
      // If S3 fails, save locally
      console.log('[BARBER IMAGE] S3 failed, saving locally:', s3Error);
      
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'barbers');
      await mkdir(uploadsDir, { recursive: true });
      
      const filePath = path.join(uploadsDir, fileName);
      await writeFile(filePath, buffer);
      
      imageUrl = `/uploads/barbers/${fileName}`;
      console.log('[BARBER IMAGE] Saved locally:', imageUrl);
    }

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
    await prisma.barber.update({
      where: { id: barber.id },
      data: { profileImage: imageUrl }
    });

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
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}