import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { uploadFile, getFileUrl } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo administradores pueden subir imágenes' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    console.log('[Upload Service Local] FormData keys:', Array.from(formData.keys()));
    console.log('[Upload Service Local] File received:', file ? { name: file.name, type: file.type, size: file.size } : 'null');

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'El archivo debe ser una imagen' },
        { status: 400 }
      );
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'La imagen no debe superar los 10MB' },
        { status: 400 }
      );
    }

    // Convertir a buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generar nombre de archivo único
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const fileName = `${timestamp}.${ext}`;

    // Prefer S3 when available (Vercel/serverless friendly)
    try {
      console.log('[Upload Service Local] Attempting S3 upload...');
      const cloud_storage_path = await uploadFile(buffer, `services/${fileName}`, true);
      const imageUrl = await getFileUrl(cloud_storage_path, true);
      console.log('[Upload Service Local] S3 upload successful:', imageUrl);

      return NextResponse.json(
        {
          url: imageUrl,
          cloud_storage_path,
        },
        { status: 200 }
      );
    } catch (s3Error) {
      console.log('[Upload Service Local] S3 failed, saving locally:', s3Error);
    }

    // Asegurar que existe el directorio public/uploads/services
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'services');
    await mkdir(uploadsDir, { recursive: true });

    // Guardar archivo
    const filePath = path.join(uploadsDir, fileName);
    await writeFile(filePath, buffer);

    // Generar URL pública
    const imageUrl = `/uploads/services/${fileName}`;

    console.log('[Upload Service Local] Image saved successfully:', imageUrl);

    return NextResponse.json(
      { 
        url: imageUrl,
        cloud_storage_path: imageUrl
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Upload Service Local] Error uploading service image:', error);
    return NextResponse.json(
      { error: 'Error al subir la imagen' },
      { status: 500 }
    );
  }
}
