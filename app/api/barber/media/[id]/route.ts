import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { isBarberOrAdmin } from '@/lib/auth/role-utils';

// DELETE /api/barber/media/[id] - Delete media from gallery
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !isBarberOrAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only barbers can delete media.' },
        { status: 401 }
      );
    }

    const mediaId = params.id;

    // Find the barber record
    const barber = await prisma.barber.findUnique({
      where: { userId: session.user.id },
    });

    if (!barber) {
      return NextResponse.json(
        { error: 'Barber profile not found.' },
        { status: 404 }
      );
    }

    // Verify the media belongs to this barber
    const media = await prisma.barberMedia.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      return NextResponse.json(
        { error: 'Media not found.' },
        { status: 404 }
      );
    }

    if (media.barberId !== barber.id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this media.' },
        { status: 403 }
      );
    }

    // Soft delete - mark as inactive
    await prisma.barberMedia.update({
      where: { id: mediaId },
      data: { isActive: false },
    });

    return NextResponse.json({
      message: 'Media deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json(
      { error: 'Failed to delete media.' },
      { status: 500 }
    );
  }
}

// PUT /api/barber/media/[id] - Update media details
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !isBarberOrAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only barbers can update media.' },
        { status: 401 }
      );
    }

    const mediaId = params.id;
    const body = await req.json();
    const { title, description } = body;

    // Find the barber record
    const barber = await prisma.barber.findUnique({
      where: { userId: session.user.id },
    });

    if (!barber) {
      return NextResponse.json(
        { error: 'Barber profile not found.' },
        { status: 404 }
      );
    }

    // Verify the media belongs to this barber
    const media = await prisma.barberMedia.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      return NextResponse.json(
        { error: 'Media not found.' },
        { status: 404 }
      );
    }

    if (media.barberId !== barber.id) {
      return NextResponse.json(
        { error: 'You do not have permission to update this media.' },
        { status: 403 }
      );
    }

    // Update media
    const updatedMedia = await prisma.barberMedia.update({
      where: { id: mediaId },
      data: {
        title: title || null,
        description: description || null,
      },
    });

    return NextResponse.json({
      message: 'Media updated successfully.',
      media: updatedMedia,
    });
  } catch (error) {
    console.error('Error updating media:', error);
    return NextResponse.json(
      { error: 'Failed to update media.' },
      { status: 500 }
    );
  }
}
