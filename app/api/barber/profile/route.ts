import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { isBarberOrAdmin } from '@/lib/auth/role-utils';

export const dynamic = 'force-dynamic';

// GET /api/barber/profile - Get barber's own profile
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !isBarberOrAdmin(session.user.role)) {
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

    if (!session || !isBarberOrAdmin(session.user.role)) {
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

    const normalizeEmail = (value: unknown) => {
      if (value === null) return null;
      if (value === undefined) return undefined;
      const trimmed = String(value).trim();
      return trimmed.length ? trimmed : null;
    };

    const normalizePhone = (value: unknown) => {
      if (value === null) return null;
      if (value === undefined) return undefined;
      const trimmed = String(value).trim();
      if (!trimmed) return null;
      const normalized = trimmed.replace(/[^0-9+]/g, '');
      return normalized.length ? normalized : null;
    };

    const normalizeCashAppTag = (value: unknown) => {
      if (value === null) return null;
      if (value === undefined) return undefined;
      const raw = String(value).trim();
      if (!raw) return null;

      // Accept inputs like "$tag", "tag", or full URLs like "https://cash.app/$tag".
      const withoutSpaces = raw.replace(/\s+/g, '');
      const fromUrl = withoutSpaces.replace(/^https?:\/\/(www\.)?cash\.app\//i, '');
      const tag = fromUrl.replace(/^\$/g, '').replace(/^@/g, '');
      const cleaned = tag.replace(/[^a-zA-Z0-9_]/g, '');
      return cleaned.length ? `$${cleaned}` : null;
    };

    const normalizedZelleEmail = normalizeEmail(zelleEmail);
    const normalizedZellePhone = normalizePhone(zellePhone);
    const normalizedCashappTag = normalizeCashAppTag(cashappTag);

    if (typeof normalizedZelleEmail === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedZelleEmail)) {
        return NextResponse.json({ error: 'Invalid Zelle email format.' }, { status: 400 });
      }
    }

    if (typeof normalizedZellePhone === 'string') {
      // Keep this lenient: accept + and digits; basic length sanity check.
      const digitsOnly = normalizedZellePhone.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        return NextResponse.json({ error: 'Invalid Zelle phone number.' }, { status: 400 });
      }
    }

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
        zelleEmail: normalizedZelleEmail !== undefined ? normalizedZelleEmail : barber.zelleEmail,
        zellePhone: normalizedZellePhone !== undefined ? normalizedZellePhone : barber.zellePhone,
        cashappTag: normalizedCashappTag !== undefined ? normalizedCashappTag : barber.cashappTag,
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
