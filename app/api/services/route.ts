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
      where.OR = [{ barberId: null }, { barberId }];
    }

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

    // Client views: defensively dedupe services to avoid legacy per-barber clones
    if (adminView !== 'true') {
      const requestedBarberId = barberId;
      const keyFor = (s: { name: string; duration: number; price: number; gender: string | null }) => {
        const normalizedName = s.name.trim().toLowerCase();
        return `${s.gender ?? ''}::${normalizedName}::${s.duration}::${s.price}`;
      };

      const rank = (s: (typeof services)[number]) => {
        // If a barber is selected, prefer that barber's row, then general.
        if (requestedBarberId) {
          if (s.barberId === requestedBarberId) return 2;
          if (s.barberId === null) return 1;
          return 0;
        }
        // If no barber selected, prefer general services.
        if (s.barberId === null) return 2;
        return 1;
      };

      const byKey = new Map<string, (typeof services)[number]>();
      for (const service of services) {
        const key = keyFor(service);
        const existing = byKey.get(key);
        if (!existing) {
          byKey.set(key, service);
          continue;
        }

        // Keep the "best" row for this key based on context
        if (rank(service) > rank(existing)) byKey.set(key, service);
      }

      return NextResponse.json({ services: Array.from(byKey.values()) });
    }

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

    const normalizedGender = gender || 'UNISEX';

    const findExisting = async (targetBarberId: string | null) => {
      return prisma.service.findFirst({
        where: {
          isActive: true,
          barberId: targetBarberId,
          gender: normalizedGender,
          duration,
          price,
          name: {
            equals: name,
            mode: 'insensitive',
          },
        },
      });
    };

    // Si barberId no viene, crear/retornar un servicio GENERAL (barberId: null)
    // (Evita duplicar servicios por cada barbero y también protege contra múltiples submits.)
    if (!barberId || barberId === '') {
      const existing = await findExisting(null);
      if (existing) {
        return NextResponse.json({ service: existing, alreadyExists: true }, { status: 200 });
      }

      const service = await prisma.service.create({
        data: {
          name,
          description: description || null,
          duration,
          price,
          image: image || null,
          barberId: null,
          gender: normalizedGender,
        },
      });

      return NextResponse.json({ service }, { status: 201 });
    }

    // Si hay barberId específico, crear solo ese servicio (idempotente)
    const existingForBarber = await findExisting(barberId);
    if (existingForBarber) {
      return NextResponse.json({ service: existingForBarber, alreadyExists: true }, { status: 200 });
    }

    const service = await prisma.service.create({
      data: {
        name,
        description: description || null,
        duration,
        price,
        image: image || null,
        barberId: barberId,
        gender: normalizedGender,
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
