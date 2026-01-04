import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { uploadFile, getFileUrl } from '@/lib/s3';
import { isBarberOrStylist } from '@/lib/auth/role-utils';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !(session.user.role === 'ADMIN' || isBarberOrStylist(session.user.role))) {
      return NextResponse.json(
        { error: 'No autorizado para subir imágenes' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

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
    const fileName = `services/${timestamp}.${ext}`;

    // Subir a S3 (público)
    const cloud_storage_path = await uploadFile(buffer, fileName, true);

    // Obtener URL público
    const imageUrl = await getFileUrl(cloud_storage_path, true);

    return NextResponse.json(
      { 
        url: imageUrl,
        cloud_storage_path 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error uploading service image:', error);
    return NextResponse.json(
      { error: 'Error al subir la imagen' },
      { status: 500 }
    );
  }
}
