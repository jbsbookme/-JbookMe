import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { put } from '@vercel/blob';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const formData = await req.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json(
        { message: 'No se proporcionó ninguna imagen' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    if (!image.type.startsWith('image/')) {
      return NextResponse.json(
        { message: 'El archivo debe ser una imagen' },
        { status: 400 }
      );
    }

    // Validar tamaño (10MB máximo)
    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { message: 'La imagen no debe superar los 10MB' },
        { status: 400 }
      );
    }

    // Convertir a buffer
    const timestamp = Date.now();
    const safeName = (image.name || 'profile').replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `profiles/users/${session.user.id}/${timestamp}-${safeName}`;

    const blob = await put(fileName, image, {
      access: 'public',
      addRandomSuffix: false,
    });

    const imageUrl = blob.url;

    // Actualizar usuario en la base de datos
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { image: imageUrl },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return NextResponse.json({
      message: 'Imagen actualizada exitosamente',
      imageUrl: updatedUser.image,
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { message: 'Error al subir la imagen' },
      { status: 500 }
    );
  }
}
