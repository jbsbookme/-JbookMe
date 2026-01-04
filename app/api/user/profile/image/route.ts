import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

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
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generar nombre único
    const timestamp = Date.now();
    const ext = image.name.split('.').pop() || image.type.split('/')[1];
    const fileName = `profile-${session.user.id}-${timestamp}.${ext}`;

    // Guardar localmente en public/uploads/profiles/
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
    await mkdir(uploadsDir, { recursive: true });
    
    const filePath = path.join(uploadsDir, fileName);
    await writeFile(filePath, buffer);

    // URL pública para acceder a la imagen
    const imageUrl = `/uploads/profiles/${fileName}`;

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
