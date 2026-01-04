import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET single service by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const serviceId = params.id;

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        barber: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        _count: {
          select: {
            appointments: true,
          },
        },
      },
    });

    if (!service) {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ service });
  } catch (error) {
    console.error('Error fetching service:', error);
    return NextResponse.json({ error: 'Error al obtener servicio' }, { status: 500 });
  }
}

// PUT update service (admin/barber)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const serviceId = params.id;
    const body = await request.json();
    const { 
      name, 
      description, 
      duration, 
      price, 
      image, 
      barberId, 
      isActive, 
      gender
    } = body;

    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!existingService) {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
    }

    // Update service
    const updatedService = await prisma.service.update({
      where: { id: serviceId },
      data: {
        name: name !== undefined ? name : existingService.name,
        description: description !== undefined ? description : existingService.description,
        duration: duration !== undefined ? duration : existingService.duration,
        price: price !== undefined ? price : existingService.price,
        image: image !== undefined ? image : existingService.image,
        barberId: barberId !== undefined ? barberId : existingService.barberId,
        isActive: isActive !== undefined ? isActive : existingService.isActive,
        gender: gender !== undefined ? gender : existingService.gender,
      },
      include: {
        barber: {
          include: {
            user: true,
          },
        },
      },
    });

    return NextResponse.json({ service: updatedService });
  } catch (error) {
    console.error('Error updating service:', error);
    return NextResponse.json({ error: 'Error al actualizar servicio' }, { status: 500 });
  }
}

// DELETE service (admin) - soft delete by setting isActive to false
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const serviceId = params.id;

    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!existingService) {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
    }

    // Soft delete by setting isActive to false
    const deletedService = await prisma.service.update({
      where: { id: serviceId },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      message: 'Servicio desactivado exitosamente',
      service: deletedService,
    });
  } catch (error) {
    console.error('Error deleting service:', error);
    return NextResponse.json({ error: 'Error al desactivar servicio' }, { status: 500 });
  }
}
