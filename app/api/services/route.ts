import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET all active services
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const barberId = searchParams.get('barberId');
    const gender = searchParams.get('gender');
    const adminView = searchParams.get('adminView'); // Nuevo parámetro para vista de admin

    if (adminView === 'true') {
      const session = await getServerSession(authOptions);
      const role = session?.user?.role;

      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }

      if (role !== 'ADMIN' && role !== 'BARBER' && role !== 'STYLIST') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    /**
     * LÓGICA ACTUALIZADA:
     * 
     * ADMIN VIEW (adminView=true):
     * - Muestra TODOS los servicios (generales + específicos de cada barbero)
     * - No filtra por barberId
     * - Permite editar/ver todos los servicios
     * 
     * CLIENT VIEW CON BARBER (barberId presente):
     * - Muestra servicios asignados a ese barbero específico
     * - Muestra también servicios generales (barberId: null)
     * - Filtra por género del barbero
     * 
     * CLIENT VIEW SIN BARBER:
     * - Solo muestra servicios generales (barberId: null)
     * - Filtra por género si se especifica
     */
    
    const where: Prisma.ServiceWhereInput = {
      isActive: true,
    };

    // Filtrado por barberId
    if (adminView === 'true') {
      // Admin: mostrar TODOS los servicios
      // No filtrar por barberId
    } else if (barberId) {
      // Cliente con barbero específico: mostrar servicios de ese barbero + generales
      where.OR = [
        { barberId: null }, // Servicios generales
        { barberId: barberId }, // Servicios del barbero específico
      ];
    }
    // Si no hay barberId, mostrar TODOS los servicios (no filtrar por barberId)
    // Esto permite que los clientes vean servicios disponibles antes de elegir barbero

    // Filtrar por género si se especifica (aplica para clientes)
    // NO INCLUIR UNISEX - Solo el género exacto
    if (gender && (gender === 'MALE' || gender === 'FEMALE')) {
      where.gender = gender; // STRICT: Solo género exacto (sin UNISEX)
    }

    const services = await prisma.service.findMany({
      where,
      include: {
        barber: {
          include: {
            user: {
              select: {
                name: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json({ services });
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json({ error: 'Error al obtener servicios' }, { status: 500 });
  }
}

// POST create a new service (admin/barber)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      duration,
      price,
      image,
      barberId,
      gender,
    } = body;

    if (!name || !duration || !price) {
      return NextResponse.json(
        { error: 'Nombre, duración y precio son requeridos' },
        { status: 400 }
      );
    }

    // Si barberId es null (General), asignar a todos los barberos del género correcto
    if (!barberId || barberId === '') {
      // Buscar barberos del género correcto
      const whereGender: Prisma.BarberWhereInput = {};
      if (gender === 'MALE') {
        whereGender.gender = 'MALE';
      } else if (gender === 'FEMALE') {
        whereGender.gender = 'FEMALE';
      }
      // Si es UNISEX, no filtrar por género (asignar a todos)

      const targetBarbers = await prisma.barber.findMany({
        where: whereGender,
      });

      if (targetBarbers.length === 0) {
        return NextResponse.json(
          { error: 'No hay barberos del género seleccionado' },
          { status: 400 }
        );
      }

      // Crear un servicio para cada barbero
      const servicesCreated = await Promise.all(
        targetBarbers.map((barber) =>
          prisma.service.create({
            data: {
              name,
              description: description || null,
              duration,
              price,
              image: image || null,
              barberId: barber.id,
              gender: gender || 'UNISEX',
            },
          })
        )
      );

      return NextResponse.json({
        message: `${servicesCreated.length} servicios creados para barberos ${gender}`,
        services: servicesCreated,
      });
    }

    // Si hay barberId específico, crear solo ese servicio
    const service = await prisma.service.create({
      data: {
        name,
        description: description || null,
        duration,
        price,
        image: image || null,
        barberId: barberId,
        gender: gender || 'UNISEX',
      },
      include: {
        barber: {
          include: {
            user: true,
          },
        },
      },
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    console.error('Error creating service:', error);
    return NextResponse.json({ error: 'Error al crear servicio' }, { status: 500 });
  }
}
