import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { getAutoAdminResponseForReview } from '@/lib/reviews-auto-response';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { barberId, rating } = await req.json();

    if (!barberId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Datos inválidos' },
        { status: 400 }
      );
    }

    // Check if barber exists
    const barber = await prisma.barber.findUnique({
      where: { id: barberId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!barber) {
      return NextResponse.json(
        { error: 'Barbero no encontrado' },
        { status: 404 }
      );
    }

    // Get client info
    const client = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Check if user has already rated this barber recently (not tied to appointment)
    const existingQuickRating = await prisma.review.findFirst({
      where: {
        barberId,
        clientId: session.user.id,
        appointmentId: {
          startsWith: 'quick-',
        },
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      },
    });

    if (existingQuickRating) {
      return NextResponse.json(
        { error: 'Ya calificaste a este barbero recientemente. Intenta de nuevo en una semana.' },
        { status: 429 }
      );
    }

    // Create a unique pseudo-appointmentId for quick ratings
    const quickAppointmentId = `quick-${Date.now()}-${session.user.id.substring(0, 8)}`;

    // Reviews require a valid Appointment due to FK constraint.
    // Create a placeholder appointment far in the past so it won't appear in normal UI lists.
    const service = await prisma.service.findFirst({
      where: { isActive: true },
      select: { id: true },
    });

    if (!service) {
      return NextResponse.json(
        { error: 'No active services available to submit a rating' },
        { status: 400 }
      );
    }

    const { adminResponse, adminRespondedAt } = getAutoAdminResponseForReview(rating);

    const { review, avgRating } = await prisma.$transaction(async (tx) => {
      await tx.appointment.create({
        data: {
          id: quickAppointmentId,
          clientId: session.user.id,
          barberId,
          serviceId: service.id,
          date: new Date(0),
          time: '00:00',
          status: 'COMPLETED',
        },
      });

      const createdReview = await tx.review.create({
        data: {
          barberId,
          clientId: session.user.id,
          appointmentId: quickAppointmentId,
          rating,
          comment: `⭐ Quick rating: ${rating} star${rating > 1 ? 's' : ''}`,
          adminResponse,
          adminRespondedAt,
        },
        include: {
          client: {
            select: {
              name: true,
              email: true,
              image: true,
            },
          },
          barber: {
            select: {
              id: true,
              profileImage: true,
            },
          },
        },
      });

      const allReviews = await tx.review.findMany({
        where: { barberId },
        select: { rating: true },
      });

      const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
      const nextAvgRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;

      await tx.barber.update({
        where: { id: barberId },
        data: { rating: nextAvgRating },
      });

      return { review: createdReview, avgRating: nextAvgRating };
    });

    // Create notification for barber
    try {
      const notificationTitle = rating >= 4 
        ? '⭐ Nueva calificación recibida' 
        : '⚠️ Nueva calificación recibida';
      
      await prisma.notification.create({
        data: {
          userId: barber.user.id,
          type: 'NEW_REVIEW',
          title: notificationTitle,
          message: `${client.name} te calificó con ${rating} estrella${rating > 1 ? 's' : ''}`,
          link: `/dashboard/barbero/resenas`,
        },
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // Continue even if notification fails
    }

    // Send notification to admins if rating is low
    if (rating <= 3) {
      try {
        const admins = await prisma.user.findMany({
          where: { role: 'ADMIN' },
          select: { id: true },
        });

        const barberName = barber.user?.name || 'Barbero';

        for (const admin of admins) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              type: 'NEW_REVIEW',
              title: '⚠️ Calificación baja recibida',
              message: `${barberName} recibió ${rating} estrella${rating > 1 ? 's' : ''} de ${client.name}`,
              link: `/dashboard/admin/resenas`,
            },
          });
        }
      } catch (notifError) {
        console.error('Error creating admin notifications:', notifError);
        // Continue even if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      review,
      avgRating,
      message: 'Rating submitted successfully',
    });
  } catch (error) {
    console.error('Error creating quick rating:', error);
    return NextResponse.json(
      { error: 'Failed to submit rating' },
      { status: 500 }
    );
  }
}
