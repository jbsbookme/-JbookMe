import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET single barber by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const barberId = params.id;

    const barber = await prisma.barber.findUnique({
      where: { id: barberId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            phone: true,
          },
        },
        services: {
          where: { isActive: true },
        },
        reviews: {
          select: {
            rating: true,
          },
        },
        _count: {
          select: {
            reviews: true,
            appointments: true,
          },
        },
      },
    });

    if (!barber) {
      return NextResponse.json({ error: 'Barber not found' }, { status: 404 });
    }

    // Calculate average rating
    const totalRating = barber.reviews.reduce((sum, review) => sum + review.rating, 0);
    const avgRating = barber.reviews.length > 0 ? totalRating / barber.reviews.length : 0;

    const barberWithRating = {
      ...barber,
      avgRating: Number(avgRating.toFixed(1)),
      totalReviews: barber._count.reviews,
      totalAppointments: barber._count.appointments,
    };

    return NextResponse.json({ barber: barberWithRating });
  } catch (error) {
    console.error('Error fetching barber:', error);
    return NextResponse.json({ error: 'Failed to fetch barber' }, { status: 500 });
  }
}

// PUT update barber (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const barberId = params.id;
    const body = await request.json();
    const { 
      name, 
      bio, 
      specialties, 
      hourlyRate, 
      profileImage, 
      isActive, 
      contactEmail, 
      gender,
      facebookUrl,
      instagramUrl,
      twitterUrl,
      tiktokUrl,
      youtubeUrl,
      whatsappUrl,
      zelleEmail,
      zellePhone,
      cashappTag
    } = body;

    // Check if barber exists
    const existingBarber = await prisma.barber.findUnique({
      where: { id: barberId },
      include: { user: true },
    });

    if (!existingBarber) {
      return NextResponse.json({ error: 'Barber not found' }, { status: 404 });
    }

    // Update user name if provided
    if (name !== undefined && name !== existingBarber.user.name) {
      await prisma.user.update({
        where: { id: existingBarber.userId },
        data: { name },
      });
    }

    // Update barber
    const updatedBarber = await prisma.barber.update({
      where: { id: barberId },
      data: {
        bio: bio !== undefined ? bio : existingBarber.bio,
        specialties: specialties !== undefined ? specialties : existingBarber.specialties,
        hourlyRate: hourlyRate !== undefined ? hourlyRate : existingBarber.hourlyRate,
        profileImage: profileImage !== undefined ? profileImage : existingBarber.profileImage,
        isActive: isActive !== undefined ? isActive : existingBarber.isActive,
        contactEmail: contactEmail !== undefined ? contactEmail : existingBarber.contactEmail,
        gender: gender !== undefined ? gender : existingBarber.gender,
        facebookUrl: facebookUrl !== undefined ? facebookUrl : existingBarber.facebookUrl,
        instagramUrl: instagramUrl !== undefined ? instagramUrl : existingBarber.instagramUrl,
        twitterUrl: twitterUrl !== undefined ? twitterUrl : existingBarber.twitterUrl,
        tiktokUrl: tiktokUrl !== undefined ? tiktokUrl : existingBarber.tiktokUrl,
        youtubeUrl: youtubeUrl !== undefined ? youtubeUrl : existingBarber.youtubeUrl,
        whatsappUrl: whatsappUrl !== undefined ? whatsappUrl : existingBarber.whatsappUrl,
        zelleEmail: zelleEmail !== undefined ? zelleEmail : existingBarber.zelleEmail,
        zellePhone: zellePhone !== undefined ? zellePhone : existingBarber.zellePhone,
        cashappTag: cashappTag !== undefined ? cashappTag : existingBarber.cashappTag,
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json({ barber: updatedBarber });
  } catch (error) {
    console.error('Error updating barber:', error);
    return NextResponse.json({ error: 'Failed to update barber' }, { status: 500 });
  }
}

// DELETE barber (admin only) - Permanent deletion with safety checks
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const barberId = params.id;

    // Check if barber exists
    const existingBarber = await prisma.barber.findUnique({
      where: { id: barberId },
      include: {
        appointments: {
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED']
            }
          }
        }
      }
    });

    if (!existingBarber) {
      return NextResponse.json({ error: 'Barber not found' }, { status: 404 });
    }

    // STEP 1: Cancel all active appointments automatically
    if (existingBarber.appointments.length > 0) {
      await prisma.appointment.updateMany({
        where: {
          barberId,
          status: {
            in: ['PENDING', 'CONFIRMED']
          }
        },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: 'Appointment cancelled automatically - Barber removed by admin',
        }
      });
    }

    // STEP 2: Delete all related records
    // 1. Delete availability
    await prisma.availability.deleteMany({
      where: { barberId }
    });

    // 2. Delete days off
    await prisma.dayOff.deleteMany({
      where: { barberId }
    });

    // 3. Delete media
    await prisma.barberMedia.deleteMany({
      where: { barberId }
    });

    // 4. Delete barber payments
    await prisma.barberPayment.deleteMany({
      where: { barberId }
    });

    // 5. Delete manual payments
    await prisma.manualPayment.deleteMany({
      where: { barberId }
    });

    // 6. Delete all appointments (now all are cancelled, completed, or already cancelled)
    await prisma.appointment.deleteMany({
      where: { barberId }
    });

    // 7. Delete reviews associated with this barber
    await prisma.review.deleteMany({
      where: { barberId }
    });

    // 8. Service barberId will be set to null automatically due to onDelete: SetNull
    // No action needed here as Prisma handles it

    // 9. Get the userId before deleting barber (we need it to delete the user)
    const userIdToDelete = existingBarber.userId;

    // 10. Delete the barber record first
    await prisma.barber.delete({
      where: { id: barberId },
    });

    // 11. Delete ALL user-related records BEFORE deleting user
    
    // 11a. OAuth accounts
    await prisma.account.deleteMany({
      where: { userId: userIdToDelete },
    });

    // 11b. Active sessions
    await prisma.session.deleteMany({
      where: { userId: userIdToDelete },
    });

    // 11c. Appointments as client (where user was the client)
    await prisma.appointment.deleteMany({
      where: { clientId: userIdToDelete },
    });

    // 11d. Reviews given by user (as client)
    await prisma.review.deleteMany({
      where: { clientId: userIdToDelete },
    });

    // 11e. Invoices
    await prisma.invoice.deleteMany({
      where: { recipientId: userIdToDelete },
    });

    // 11f. Posts created by user
    await prisma.post.deleteMany({
      where: { authorId: userIdToDelete },
    });

    // 11g. Comments created by user
    await prisma.comment.deleteMany({
      where: { authorId: userIdToDelete },
    });

    // 11h. Messages sent by user
    await prisma.message.deleteMany({
      where: {
        OR: [
          { senderId: userIdToDelete },
          { recipientId: userIdToDelete },
        ],
      },
    });

    // 11i. Notifications
    await prisma.notification.deleteMany({
      where: { userId: userIdToDelete },
    });

    // 11j. Push subscriptions
    await prisma.pushSubscription.deleteMany({
      where: { userId: userIdToDelete },
    });

    // 12. FINALLY delete the user (credentials, login, etc.)
    await prisma.user.delete({
      where: { id: userIdToDelete },
    });

    return NextResponse.json({ 
      message: 'Barber and user deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting barber:', error);
    return NextResponse.json({ error: 'Failed to delete barber' }, { status: 500 });
  }
}
