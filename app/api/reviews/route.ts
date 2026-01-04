import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { AppointmentStatus } from '@prisma/client';
import { createNotification } from '@/lib/notifications';
import { getAutoAdminResponseForReview } from '@/lib/reviews-auto-response';

export const dynamic = 'force-dynamic';

// GET reviews
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const barberId = searchParams.get('barberId');
    const limit = searchParams.get('limit');

    // If the request is authenticated as a barber/stylist, they can only query
    // their own reviews.
    const session = await getServerSession(authOptions);
    if (
      barberId &&
      session?.user &&
      (session.user.role === 'BARBER' || session.user.role === 'STYLIST') &&
      session.user.barberId &&
      session.user.barberId !== barberId
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const where = barberId ? { barberId } : {};

    const reviews = await prisma.review.findMany({
      where,
      take: limit ? parseInt(limit) : undefined,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        barber: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        appointment: {
          include: {
            service: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform the data to a stable response shape used across multiple dashboards
    const transformedReviews = reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      adminResponse: review.adminResponse || null,
      adminRespondedAt: review.adminRespondedAt?.toISOString() || null,
      client: {
        id: review.client.id,
        name: review.client.name || 'Client',
        email: review.client.email || '',
        image: review.client.image || null,
      },
      barber: {
        id: review.barberId,
        name: review.barber.user.name || 'Barber',
        user: {
          name: review.barber.user.name || 'Barber',
        },
      },
      appointment: {
        service: {
          name: review.appointment?.service?.name || 'Service',
        },
      },
    }));

    return NextResponse.json(transformedReviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

// POST create a review
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { appointmentId, barberId, rating, comment } = body;

    if (!appointmentId || !barberId || !rating) {
      return NextResponse.json(
        { error: 'Appointment, barber, and rating are required' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Verify appointment belongs to user and is completed
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    if (appointment.clientId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (appointment.status !== AppointmentStatus.COMPLETED) {
      return NextResponse.json(
        { error: 'You can only leave reviews for completed appointments' },
        { status: 400 }
      );
    }

    // Check if review already exists
    const existingReview = await prisma.review.findUnique({
      where: { appointmentId },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: 'You already left a review for this appointment' },
        { status: 409 }
      );
    }

    const { adminResponse, adminRespondedAt } = getAutoAdminResponseForReview(rating);

    const review = await prisma.review.create({
      data: {
        appointmentId,
        clientId: session.user.id,
        barberId,
        rating,
        comment: comment || null,
        adminResponse,
        adminRespondedAt,
      },
      include: {
        client: {
          select: {
            name: true,
            image: true,
          },
        },
        barber: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Send notifications to admins about new review
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      });

      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          type: 'NEW_REVIEW',
          title: '⭐ New review received',
          message: `${review.client.name} left a ${rating}-star review`,
          priority: rating <= 3 ? 'HIGH' : 'NORMAL',
          metadata: {
            reviewId: review.id,
            rating: rating,
            clientName: review.client.name,
          },
        });
      }

      // Also notify the barber
      await createNotification({
        userId: review.barber.user.id,
        type: 'NEW_REVIEW',
        title: '⭐ You received a new review',
        message: `${review.client.name} left you a ${rating}-star review`,
        priority: 'NORMAL',
        metadata: {
          reviewId: review.id,
          rating: rating,
          clientName: review.client.name,
        },
      });
    } catch (notifError) {
      console.error('Error sending review notifications:', notifError);
      // Don't fail the request if notifications fail
    }

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
