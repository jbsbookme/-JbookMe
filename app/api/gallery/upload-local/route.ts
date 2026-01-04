import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { uploadFile, getFileUrl } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication/permissions
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;

    console.log('[Upload Local] FormData keys:', Array.from(formData.keys()));
    console.log('[Upload Local] File received:', file ? { name: file.name, type: file.type, size: file.size } : 'null');

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

    // Convert to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const fileName = `${timestamp}.${ext}`;

    // Prefer S3 when available
    try {
      console.log('[Upload Local] Attempting S3 upload...');
      const cloud_storage_path = await uploadFile(buffer, `gender-images/${fileName}`, true);
      const imageUrl = await getFileUrl(cloud_storage_path, true);
      console.log('[Upload Local] S3 upload successful:', imageUrl);

      return NextResponse.json({
        success: true,
        url: imageUrl,
        cloud_storage_path,
      });
    } catch (s3Error) {
      console.log('[Upload Local] S3 failed, saving locally:', s3Error);
    }

    // Ensure public/uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'gender-images');
    await mkdir(uploadsDir, { recursive: true });

    // Save file
    const filePath = path.join(uploadsDir, fileName);
    await writeFile(filePath, buffer);

    // Generate public URL
    const imageUrl = `/uploads/gender-images/${fileName}`;

    console.log('[Upload Local] Image saved successfully:', imageUrl);

    return NextResponse.json({
      success: true,
      url: imageUrl,
    });
  } catch (error) {
    console.error('[Upload Local] Error uploading image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
