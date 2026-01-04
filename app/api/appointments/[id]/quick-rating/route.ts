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
        { error: 'Unauthenticated' },
        { status: 401 }
      );
    }

    const { barberId, rating } = await req.json();

    if (!barberId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Invalid data' },
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
        { error: 'Barber not found' },
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
        { error: 'User not found' },
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
        { error: 'You already rated this barber recently. Please try again in a week.' },
        { status: 429 }
      );
    }

    // Create a unique pseudo-appointmentId for quick ratings
    const quickAppointmentId = `quick-${Date.now()}-${session.user.id.substring(0, 8)}`;

    const { adminResponse, adminRespondedAt } = getAutoAdminResponseForReview(rating);

    // Create the review (quick rating without real appointment)
    const review = await prisma.review.create({
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

    // Update barber's average rating
    const allReviews = await prisma.review.findMany({
      where: { barberId },
      select: { rating: true },
    });

    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;

    await prisma.barber.update({
      where: { id: barberId },
      data: { rating: avgRating },
    });

    // Create notification for barber
    try {
      const notificationTitle = rating >= 4 
        ? '⭐ New rating received' 
        : '⚠️ New rating received';
      
      await prisma.notification.create({
        data: {
          userId: barber.user.id,
          type: 'NEW_REVIEW',
          title: notificationTitle,
          message: `${client.name} rated you ${rating} star${rating > 1 ? 's' : ''}`,
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

        const barberName = barber.user?.name || 'Barber';

        for (const admin of admins) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              type: 'NEW_REVIEW',
              title: '⚠️ Low rating received',
              message: `${barberName} received ${rating} star${rating > 1 ? 's' : ''} from ${client.name}`,
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
