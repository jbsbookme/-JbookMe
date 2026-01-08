import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { uploadFile, getFileUrl } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Allow all authenticated users to upload (BARBER, CLIENT, ADMIN)
    // The post creation endpoint will handle role permissions

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó un archivo' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'Solo se permiten imágenes y videos' }, { status: 400 });
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo es demasiado grande (máx 50MB)' }, { status: 400 });
    }

    // Create organized folder structure
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const roleFolder = session.user.role === 'BARBER' ? 'barber_work' : 'client_share';

    // Prepare file for upload
    const fileName = file.name.replace(/\s+/g, '-');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let cloud_storage_path: string;
    let fileUrl: string;

    try {
      // Try S3 upload first
      const key = `posts/${year}/${month}/${roleFolder}/${Date.now()}-${fileName}`;
      cloud_storage_path = await uploadFile(buffer, key, true, file.type || undefined);
      fileUrl = await getFileUrl(cloud_storage_path, true);
    } catch (s3Error) {
      console.error('S3 upload failed:', s3Error);
      
      // Check if we're in serverless environment (Vercel)
      const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;
      
      if (isServerless) {
        // In serverless, we MUST use S3 - filesystem is ephemeral
        console.error('Cannot use local storage in serverless environment');
        return NextResponse.json(
          { 
            error: 'Storage configuration error. S3 credentials are required in production.',
            code: 'S3_REQUIRED',
            details: 'Please configure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in Vercel environment variables.'
          },
          { status: 500 }
        );
      }
      
      // Fallback to local storage (only in development)
      console.log('Using local storage fallback (development only)');
      const { writeFile, mkdir } = await import('fs/promises');
      const path = await import('path');

      const uploadsDir = path.join(
        process.cwd(),
        'public',
        'uploads',
        'posts',
        String(year),
        month,
        roleFolder
      );
      
      await mkdir(uploadsDir, { recursive: true });

      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const localFileName = `${timestamp}-${sanitizedFileName}`;
      const filePath = path.join(uploadsDir, localFileName);

      await writeFile(filePath, buffer);
      cloud_storage_path = `/uploads/posts/${year}/${month}/${roleFolder}/${localFileName}`;
      fileUrl = cloud_storage_path;
      
      console.log('File saved locally:', cloud_storage_path);
    }

    return NextResponse.json({
      cloud_storage_path,
      fileUrl,
      message: 'Archivo subido exitosamente',
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Error al subir el archivo' },
      { status: 500 }
    );
  }
}
