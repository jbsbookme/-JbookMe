import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { sendSMS, isTwilioConfigured } from '@/lib/twilio';
import { format, subHours, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Prisma } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Se requieren permisos de administrador' },
        { status: 403 }
      );
    }

    if (!isTwilioConfigured()) {
      return NextResponse.json(
        { 
          error: 'Twilio no está configurado',
          requiresConfiguration: true
        },
        { status: 503 }
      );
    }

    const body: unknown = await request.json();
    const type =
      typeof body === 'object' && body !== null && 'type' in body
        ? (body as { type?: unknown }).type
        : undefined;

    if (type !== '24h' && type !== '2h' && type !== 'thank_you') {
      return NextResponse.json(
        { error: 'Tipo de notificación inválido' },
        { status: 400 }
      );
    }

    let appointments: Prisma.AppointmentGetPayload<{
      include: {
        client: true;
        service: true;
        barber: { include: { user: true } };
      };
    }>[] = [];
    const now = new Date();

    switch (type) {
      case '24h':
        // Find appointments 24 hours from now
        const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        appointments = await prisma.appointment.findMany({
          where: {
            date: {
              gte: subHours(in24h, 1),
              lte: new Date(in24h.getTime() + 60 * 60 * 1000)
            },
            status: { in: ['PENDING', 'CONFIRMED'] },
            notification24hSent: false
          },
          include: {
            client: true,
            service: true,
            barber: {
              include: {
                user: true
              }
            }
          }
        });
        break;

      case '2h':
        // Find appointments 2 hours from now
        const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        appointments = await prisma.appointment.findMany({
          where: {
            date: {
              gte: subHours(in2h, 0.5),
              lte: new Date(in2h.getTime() + 30 * 60 * 1000)
            },
            status: { in: ['PENDING', 'CONFIRMED'] },
            notification2hSent: false
          },
          include: {
            client: true,
            service: true,
            barber: {
              include: {
                user: true
              }
            }
          }
        });
        break;

      case 'thank_you':
        // Find completed appointments from last 24 hours
        appointments = await prisma.appointment.findMany({
          where: {
            status: 'COMPLETED',
            updatedAt: {
              gte: subDays(now, 1)
            },
            thankYouSent: false
          },
          include: {
            client: true,
            service: true,
            barber: {
              include: {
                user: true
              }
            }
          }
        });
        break;

    }

    type SmsResult = { appointmentId: string; success: boolean; error?: string };
    const results: SmsResult[] = [];

    for (const appointment of appointments) {
      if (!appointment.client.phone) {
        results.push({
          appointmentId: appointment.id,
          success: false,
          error: 'Cliente no tiene número de teléfono'
        });
        continue;
      }

      let message = '';
      const dateFormatted = format(new Date(appointment.date), "EEEE, d 'de' MMMM", { locale: es });

      switch (type) {
        case '24h':
          message = `Recordatorio: Tu cita de ${appointment.service.name} con ${appointment.barber.user.name} es mañana ${dateFormatted} a las ${appointment.time}. ¡Te esperamos!`;
          break;
        case '2h':
          message = `¡Tu cita es en 2 horas! ${appointment.service.name} con ${appointment.barber.user.name} a las ${appointment.time}. ¡Nos vemos pronto!`;
          break;
        case 'thank_you':
          message = `¡Gracias por visitarnos! Esperamos que hayas disfrutado tu ${appointment.service.name} con ${appointment.barber.user.name}. ¡Vuelve pronto!`;
          break;
      }

      const result = await sendSMS(appointment.client.phone, message);

      if (result.success) {
        // Mark notification as sent
        const updateData: Prisma.AppointmentUpdateInput = {};
        if (type === '24h') updateData.notification24hSent = true;
        if (type === '2h') updateData.notification2hSent = true;
        if (type === 'thank_you') updateData.thankYouSent = true;

        await prisma.appointment.update({
          where: { id: appointment.id },
          data: updateData
        });
      }

      results.push({
        appointmentId: appointment.id,
        success: result.success,
        error: result.error
      });
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json(
      {
        success: true,
        message: `SMS enviados: ${successful} exitosos, ${failed} fallidos`,
        total: appointments.length,
        successful,
        failed,
        results
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('SMS appointments API error:', error);
    return NextResponse.json(
      { error: 'Error al procesar recordatorios SMS' },
      { status: 500 }
    );
  }
}
