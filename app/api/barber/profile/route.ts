import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { isBarberOrStylist } from '@/lib/auth/role-utils';

export const dynamic = 'force-dynamic';

// GET /api/barber/profile - Get barber's own profile
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !isBarberOrStylist(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only barbers can view their profile.' },
        { status: 401 }
      );
    }

    // Find the barber record
    const barber = await prisma.barber.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!barber) {
      return NextResponse.json(
        { error: 'Barber profile not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json(barber);
  } catch (error) {
    console.error('Error fetching barber profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile.' },
      { status: 500 }
    );
  }
}

// PUT /api/barber/profile - Update barber's own profile
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !isBarberOrStylist(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only barbers can update their profile.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      bio,
      specialties,
      hourlyRate,
      phone,
      facebookUrl,
      instagramUrl,
      twitterUrl,
      tiktokUrl,
      youtubeUrl,
      whatsappUrl,
      zelleEmail,
      zellePhone,
      cashappTag,
    } = body;

    // Find the barber record
    const barber = await prisma.barber.findUnique({
      where: { userId: session.user.id },
    });

    if (!barber) {
      return NextResponse.json(
        { error: 'Barber profile not found.' },
        { status: 404 }
      );
    }

    // Update barber profile
    const updatedBarber = await prisma.barber.update({
      where: { id: barber.id },
      data: {
        bio: bio !== undefined ? bio : barber.bio,
        specialties: specialties !== undefined ? specialties : barber.specialties,
        hourlyRate: hourlyRate !== undefined ? hourlyRate : barber.hourlyRate,
        phone: phone !== undefined ? phone : barber.phone,
        facebookUrl: facebookUrl !== undefined ? facebookUrl : barber.facebookUrl,
        instagramUrl: instagramUrl !== undefined ? instagramUrl : barber.instagramUrl,
        twitterUrl: twitterUrl !== undefined ? twitterUrl : barber.twitterUrl,
        tiktokUrl: tiktokUrl !== undefined ? tiktokUrl : barber.tiktokUrl,
        youtubeUrl: youtubeUrl !== undefined ? youtubeUrl : barber.youtubeUrl,
        whatsappUrl: whatsappUrl !== undefined ? whatsappUrl : barber.whatsappUrl,
        zelleEmail: zelleEmail !== undefined ? zelleEmail : barber.zelleEmail,
        zellePhone: zellePhone !== undefined ? zellePhone : barber.zellePhone,
        cashappTag: cashappTag !== undefined ? cashappTag : barber.cashappTag,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Profile updated successfully.',
      barber: updatedBarber,
    });
  } catch (error) {
    console.error('Error updating barber profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile.' },
      { status: 500 }
    );
  }
}
