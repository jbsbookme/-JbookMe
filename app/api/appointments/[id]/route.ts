import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { AppointmentStatus } from '@prisma/client';
import { sendAppointmentCancelledNotifications } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

type Params = {
  params: Promise<{ id: string }>;
};

// GET single appointment (role-scoped)
export async function GET(_request: NextRequest, context: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            phone: true,
          },
        },
        barber: {
          select: {
            id: true,
            userId: true,
            profileImage: true,
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
        service: true,
        review: true,
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const role = session.user.role;
    const userId = session.user.id;
    const sessionBarberId = (session.user as unknown as { barberId?: string | null }).barberId;

    const isAdmin = role === 'ADMIN';
    const isClientOwner = appointment.clientId === userId;
    const isBarberOwner =
      (role === 'BARBER' || role === 'STYLIST') &&
      (appointment.barber?.userId === userId ||
        (sessionBarberId && appointment.barberId === sessionBarberId));

    if (!isAdmin && !isClientOwner && !isBarberOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return NextResponse.json({ error: 'Failed to fetch appointment' }, { status: 500 });
  }
}

// Helper function to validate 2-hour cancellation policy
function canCancelAppointment(appointmentDate: Date, appointmentTime: string): boolean {
  // Parse the appointment date and time (handle both 12h and 24h formats)
  let hours: number, minutes: number;
  const timeStr = appointmentTime.trim();
  
  if (timeStr.includes('AM') || timeStr.includes('PM')) {
    // 12-hour format (e.g., "9:30 AM")
    const isPM = timeStr.includes('PM');
    const timeOnly = timeStr.replace(/AM|PM/gi, '').trim();
    const [h, m] = timeOnly.split(':').map(Number);
    hours = isPM && h !== 12 ? h + 12 : (h === 12 && !isPM ? 0 : h);
    minutes = m;
  } else {
    // 24-hour format (e.g., "09:30")
    [hours, minutes] = timeStr.split(':').map(Number);
  }
  
  // Create appointment datetime - ensure we use the correct date without timezone issues
  const appointmentDateTime = new Date(appointmentDate);
  appointmentDateTime.setHours(hours, minutes, 0, 0);

  // Calculate the difference in hours
  const now = new Date();
  const hoursDifference = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  console.log('🕒 Cancellation policy check:', {
    appointmentDate: appointmentDate.toISOString(),
    appointmentTime: timeStr,
    appointmentDateTime: appointmentDateTime.toISOString(),
    now: now.toISOString(),
    hoursDifference: hoursDifference.toFixed(2),
    canCancel: hoursDifference >= 24
  });

  return hoursDifference >= 24;
}

// PUT update appointment (alias for PATCH)
export async function PUT(request: NextRequest, context: Params) {
  return PATCH(request, context);
}

// PATCH update appointment
export async function PATCH(request: NextRequest, context: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    // If status is being changed to CANCELLED, enforce 24-hour policy
    if (body.status === AppointmentStatus.CANCELLED || body.status === 'CANCELLED') {
      const appointment = await prisma.appointment.findUnique({
        where: { id },
      });

      if (!appointment) {
        return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
      }

      // Admins can cancel anytime
      if (session.user.role !== 'ADMIN') {
        if (!canCancelAppointment(appointment.date, appointment.time)) {
          return NextResponse.json(
            {
              error:
                'Cannot cancel appointment. Must be cancelled at least 24 hours in advance.',
            },
            { status: 400 }
          );
        }
      }

      // Add cancellation timestamp and reason
      body.cancelledAt = new Date();
      if (!body.cancellationReason) {
        body.cancellationReason = 'Cancelled by user';
      }
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: body,
      include: {
        client: true,
        barber: {
          select: {
            id: true,
            profileImage: true,
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
        service: true,
      },
    });

    // If the appointment is marked as completed, create an invoice automatically
    if (body.status === AppointmentStatus.COMPLETED || body.status === 'COMPLETED') {
      try {
        // Check if an invoice already exists for this appointment
        const existingInvoice = await prisma.invoice.findFirst({
          where: { appointmentId: id },
        });

        if (!existingInvoice) {
          // Fetch shop settings
          let settings = await prisma.settings.findFirst();
          if (!settings) {
            settings = await prisma.settings.create({
              data: {
                shopName: 'JBookMe',
                address: '',
                phone: '',
                email: '',
              },
            });
          }

          // Generate a unique invoice number
          const currentYear = new Date().getFullYear();
          const lastInvoice = await prisma.invoice.findFirst({
            where: {
              invoiceNumber: {
                startsWith: `INV-${currentYear}-`,
              },
            },
            orderBy: {
              invoiceNumber: 'desc',
            },
          });

          let nextNumber = 1;
          if (lastInvoice) {
            const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
            nextNumber = lastNumber + 1;
          }

          const invoiceNumber = `INV-${currentYear}-${String(nextNumber).padStart(4, '0')}`;

          // Create the invoice
          await prisma.invoice.create({
            data: {
              invoiceNumber,
              type: 'CLIENT_SERVICE',
              appointmentId: id,
              issuerName: settings.shopName,
              issuerAddress: settings.address || '',
              issuerPhone: settings.phone || '',
              issuerEmail: settings.email || '',
              recipientId: updatedAppointment.clientId,
              recipientName: updatedAppointment.client.name || 'Unnamed',
              recipientEmail: updatedAppointment.client.email,
              recipientPhone: updatedAppointment.client.phone || '',
              amount: updatedAppointment.service.price,
              description: `Service: ${updatedAppointment.service.name} - Barber: ${updatedAppointment.barber.user.name}`,
              items: [
                {
                  description: updatedAppointment.service.name,
                  quantity: 1,
                  unitPrice: updatedAppointment.service.price,
                  total: updatedAppointment.service.price,
                },
              ],
              isPaid: true,
              paidAt: new Date(),
            },
          });
        }
      } catch (invoiceError) {
        console.error('Error creating invoice for completed appointment:', invoiceError);
        // Do not fail the appointment update if invoice creation fails
      }
    }

    return NextResponse.json({ appointment: updatedAppointment });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
  }
}

// DELETE cancel or permanently delete appointment
// Query param: ?permanent=true for hard delete (admin only)
export async function DELETE(request: NextRequest, context: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const permanentDelete = searchParams.get('permanent') === 'true';

    // Get the appointment first
    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // PERMANENT DELETE (Admin only, for cleaning up cancelled appointments)
    if (permanentDelete) {
      if (session.user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Only admins can permanently delete appointments' },
          { status: 403 }
        );
      }

      // Delete the appointment permanently from database
      await prisma.appointment.delete({
        where: { id },
      });

      return NextResponse.json({ 
        message: 'Appointment permanently deleted from the database' 
      });
    }

    // SOFT DELETE (Cancel appointment - normal flow)
    // Admins can cancel anytime
    if (session.user.role !== 'ADMIN') {
      if (!canCancelAppointment(appointment.date, appointment.time)) {
        return NextResponse.json(
          {
            error:
              'Cannot cancel appointment. Must be cancelled at least 24 hours in advance.',
          },
          { status: 400 }
        );
      }
    }

    // Get full appointment details for notifications
    const fullAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        client: true,
        barber: {
          include: {
            user: true,
          },
        },
        service: true,
      },
    });

    if (!fullAppointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Soft delete - mark as cancelled
    await prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: 'Cancelled by user',
      },
    });

    // Send cancellation notifications to client, barber, and admin
    try {
      const notificationData = {
        clientName: fullAppointment.client.name || 'Client',
        clientEmail: fullAppointment.client.email || '',
        clientPhone: fullAppointment.client.phone || '',
        barberName: fullAppointment.barber.user.name || 'Barber',
        barberEmail: fullAppointment.barber.user.email || '',
        barberPhone: '', // Add barber phone if available in your schema
        serviceName: fullAppointment.service.name,
        date: fullAppointment.date,
        time: fullAppointment.time,
        price: fullAppointment.service.price,
        appointmentId: fullAppointment.id,
      };

      const notificationResults = await sendAppointmentCancelledNotifications(notificationData);
      console.log('Cancellation notification results:', notificationResults);
    } catch (notificationError) {
      // Log notification errors but don't fail the cancellation
      console.error('Error sending cancellation notifications:', notificationError);
    }

    return NextResponse.json({ message: 'Appointment cancelled successfully' });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return NextResponse.json({ error: 'Error processing request' }, { status: 500 });
  }
}
