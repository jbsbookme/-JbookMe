import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST toggle like (add or remove like)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const imageId = params.id;
    const userId = session.user.id;

    // Check if image exists
    const image = await prisma.galleryImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 });
    }

    // Check if user already liked this image
    const existingLike = await prisma.galleryLike.findUnique({
      where: {
        userId_imageId: {
          userId,
          imageId,
        },
      },
    });

    if (existingLike) {
      // Unlike - remove the like
      await prisma.galleryLike.delete({
        where: {
          id: existingLike.id,
        },
      });

      // Decrement likes count
      const updatedImage = await prisma.galleryImage.update({
        where: { id: imageId },
        data: {
          likes: {
            decrement: 1,
          },
        },
      });

      return NextResponse.json({
        liked: false,
        likes: updatedImage.likes,
        message: 'Like eliminado',
      });
    } else {
      // Like - add the like
      await prisma.galleryLike.create({
        data: {
          userId,
          imageId,
        },
      });

      // Increment likes count
      const updatedImage = await prisma.galleryImage.update({
        where: { id: imageId },
        data: {
          likes: {
            increment: 1,
          },
        },
      });

      return NextResponse.json({
        liked: true,
        likes: updatedImage.likes,
        message: 'Like agregado',
      });
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    return NextResponse.json({ error: 'Error al procesar like' }, { status: 500 });
  }
}

// GET check if user has liked this image
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ liked: false });
    }

    const imageId = params.id;
    const userId = session.user.id;

    const like = await prisma.galleryLike.findUnique({
      where: {
        userId_imageId: {
          userId,
          imageId,
        },
      },
    });

    return NextResponse.json({ liked: !!like });
  } catch (error) {
    console.error('Error checking like:', error);
    return NextResponse.json({ error: 'Error al verificar like' }, { status: 500 });
  }
}
