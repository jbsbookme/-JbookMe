import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { network, url, barberId } = body;

    if (!network || !url) {
      return NextResponse.json(
        { error: 'Network y URL son requeridos' },
        { status: 400 }
      );
    }

    // Crear el registro del click
    const click = await prisma.socialMediaClick.create({
      data: {
        barberId: barberId || null,
        network,
        url,
      },
    });

    return NextResponse.json({ success: true, click });
  } catch (error) {
    console.error('Error registrando click de red social:', error);
    return NextResponse.json(
      { error: 'Error al registrar el click' },
      { status: 500 }
    );
  }
}
