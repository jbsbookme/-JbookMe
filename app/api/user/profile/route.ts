import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - Obtener perfil del usuario
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        gender: true,
        legalAcceptedVersion: true,
        legalAcceptedAt: true,
        barber: {
          select: {
            id: true,
            profileImage: true,
            zelleEmail: true,
            zellePhone: true,
            cashappTag: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { message: 'Error al obtener el perfil' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar perfil del usuario
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, gender } = body;

    const updateData: Prisma.UserUpdateInput = {};

    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return NextResponse.json(
          { message: 'El nombre no puede estar vacío' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (gender !== undefined) {
      // Validar que gender sea un valor válido
      if (gender !== null && !['MALE', 'FEMALE', 'BOTH', 'UNISEX'].includes(gender)) {
        return NextResponse.json(
          { message: 'Género inválido' },
          { status: 400 }
        );
      }
      updateData.gender = gender;
    }

    if (email !== undefined) {
      if (!email || email.trim().length === 0) {
        return NextResponse.json(
          { message: 'El email no puede estar vacío' },
          { status: 400 }
        );
      }
      
      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { message: 'Formato de email inválido' },
          { status: 400 }
        );
      }

      // Verificar que el email no esté en uso por otro usuario
      const existingUser = await prisma.user.findUnique({
        where: { email: email.trim() },
      });

      if (existingUser && existingUser.id !== session.user.id) {
        return NextResponse.json(
          { message: 'El email ya está en uso' },
          { status: 400 }
        );
      }

      updateData.email = email.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: 'No hay cambios para actualizar' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        gender: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { message: 'Error al actualizar el perfil' },
      { status: 500 }
    );
  }
}
