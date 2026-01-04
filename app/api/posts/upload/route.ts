import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { uploadFile, getFileUrl } from '@/lib/s3';
import { isBarberOrStylist } from '@/lib/auth/role-utils';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!isBarberOrStylist(session.user.role)) {
      return NextResponse.json({ error: 'Solo barberos pueden subir posts' }, { status: 403 });
    }

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

    // Upload file to S3
    const fileName = file.name.replace(/\s+/g, '-');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const cloud_storage_path = await uploadFile(buffer, fileName, true);

    // Get the public URL
    const fileUrl = await getFileUrl(cloud_storage_path, true);

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
