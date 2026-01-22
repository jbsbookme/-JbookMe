import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json(
    {
      error: 'Esta ruta fue deshabilitada. Las subidas de posts ahora van solo por Cloudinary.',
      hint:
        'Sube el archivo directamente a Cloudinary (unsigned upload preset) y luego crea el post con /api/posts usando JSON: { mediaUrl, caption }.',
      code: 'POSTS_UPLOAD_DISABLED',
    },
    { status: 410 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: 'Esta ruta fue deshabilitada. Las subidas de posts ahora van solo por Cloudinary.',
        hint:
          'Sube el archivo directamente a Cloudinary (unsigned upload preset) y luego crea el post con /api/posts usando JSON: { mediaUrl, caption }.',
        code: 'POSTS_UPLOAD_DISABLED',
      },
      { status: 410 }
    );
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Error al subir el archivo' },
      { status: 500 }
    );
  }
}
