import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { put } from '@vercel/blob';

export const runtime = 'nodejs';
export const maxDuration = 60;

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

    // Validate file size (60MB max to match client + /api/blob/upload)
    if (file.size > 60 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo es demasiado grande (máx 60MB)' }, { status: 400 });
    }

    // Create organized folder structure
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const roleFolder = session.user.role === 'BARBER' ? 'barber_work' : 'client_share';

    const fileName = file.name.replace(/\s+/g, '-');
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `posts/${year}/${month}/${roleFolder}/${Date.now()}-${sanitizedFileName}`;

    const blob = await put(key, file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: file.type || undefined,
    });

    const cloud_storage_path = blob.url;
    const fileUrl = blob.url;

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
