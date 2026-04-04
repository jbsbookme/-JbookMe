import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import bcrypt from 'bcryptjs';
import { DayOfWeek } from '@prisma/client';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * Creates default availability schedule for a new barber
 * Monday - Saturday: 9:00 AM - 6:00 PM
 * Sunday: Closed by default
 */
async function createDefaultAvailability(barberId: string) {
  const defaultSchedule = [
    { dayOfWeek: DayOfWeek.MONDAY, startTime: '09:00', endTime: '18:00', isAvailable: true },
    { dayOfWeek: DayOfWeek.TUESDAY, startTime: '09:00', endTime: '18:00', isAvailable: true },
    { dayOfWeek: DayOfWeek.WEDNESDAY, startTime: '09:00', endTime: '18:00', isAvailable: true },
    { dayOfWeek: DayOfWeek.THURSDAY, startTime: '09:00', endTime: '18:00', isAvailable: true },
    { dayOfWeek: DayOfWeek.FRIDAY, startTime: '09:00', endTime: '18:00', isAvailable: true },
    { dayOfWeek: DayOfWeek.SATURDAY, startTime: '09:00', endTime: '18:00', isAvailable: true },
    { dayOfWeek: DayOfWeek.SUNDAY, startTime: '09:00', endTime: '18:00', isAvailable: false }, // Closed on Sunday by default
  ];

  await prisma.availability.createMany({
    data: defaultSchedule.map(schedule => ({
      barberId,
      ...schedule,
    })),
  });

  console.log(`[BARBER] Created default availability schedule for barber ${barberId}`);
}

// GET all active barbers with their ratings
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gender = searchParams.get('gender');
  const includeInactive = searchParams.get('includeInactive') === '1';
  const featuredParam = searchParams.get('featured');
  const featuredOnly = featuredParam === '1' || featuredParam === 'true';

  try {
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'ADMIN';

    const db = getAdminFirestore();
    const snapshot = await db.collection('barbers').get();

    let barbers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Array<Record<string, unknown>>;

    if (!includeInactive || !isAdmin) {
      barbers = barbers.filter((barber) => barber.isActive !== false);
    }

    if (featuredOnly) {
      barbers = barbers.filter((barber) => barber.featured === true);
    }

    if (gender === 'MALE') {
      barbers = barbers.filter((barber) => ['MALE', 'BOTH'].includes(barber.gender));
    } else if (gender === 'FEMALE') {
      barbers = barbers.filter((barber) => ['FEMALE', 'BOTH'].includes(barber.gender));
    } else if (gender === 'BOTH') {
      barbers = barbers.filter((barber) => barber.gender === 'BOTH');
    }

    return NextResponse.json(
      { barbers },
      {
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
          Vary: 'Cookie',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching barbers:', error);
    return NextResponse.json({ barbers: [] }, { status: 200 });
  }
}

// POST create a new barber (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      userId, 
      name, 
      email,
      password,
      role,
      isActive,
      bio, 
      specialties, 
      hourlyRate, 
      profileImage,
      facebookUrl,
      instagramUrl,
      twitterUrl,
      tiktokUrl,
      youtubeUrl,
      whatsappUrl,
      contactEmail,
      gender,
      zelleEmail,
      zellePhone,
      cashappTag
    } = body;

    // Prisma Role enum is ADMIN | BARBER | CLIENT.
    // The UI sometimes sends role = 'STYLIST' for “estilistas”, but in DB we store them as BARBER
    // (they are differentiated elsewhere, e.g. via Barber.gender).
    const normalizedRole = role === 'BARBER' || role === 'STYLIST' ? 'BARBER' : undefined;

    // If userId is provided, use existing user
    if (userId) {
      const barber = await prisma.barber.create({
        data: {
          userId,
          isActive: isActive ?? true,
          bio: bio || null,
          specialties: specialties || null,
          hourlyRate: hourlyRate || null,
          profileImage: profileImage || null,
          facebookUrl: facebookUrl || null,
          instagramUrl: instagramUrl || null,
          twitterUrl: twitterUrl || null,
          tiktokUrl: tiktokUrl || null,
          youtubeUrl: youtubeUrl || null,
          whatsappUrl: whatsappUrl || null,
          contactEmail: contactEmail || null,
          gender: gender || 'BOTH',
          zelleEmail: zelleEmail || null,
          zellePhone: zellePhone || null,
          cashappTag: cashappTag || null,
        },
        include: {
          user: true,
        },
      });

      if (normalizedRole) {
        await prisma.user.update({
          where: { id: userId },
          data: { role: normalizedRole },
        });
      }

      // Create default availability schedule for the new barber
      await createDefaultAvailability(barber.id);

      return NextResponse.json({ barber }, { status: 201 });
    }

    // Otherwise, create a new user and barber together
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and barber in a transaction
    const barber = await prisma.barber.create({
      data: {
        isActive: isActive ?? true,
        bio: bio || null,
        specialties: specialties || null,
        hourlyRate: hourlyRate || null,
        profileImage: profileImage || null,
        facebookUrl: facebookUrl || null,
        instagramUrl: instagramUrl || null,
        twitterUrl: twitterUrl || null,
        tiktokUrl: tiktokUrl || null,
        youtubeUrl: youtubeUrl || null,
        whatsappUrl: whatsappUrl || null,
        contactEmail: contactEmail || null,
        gender: gender || 'BOTH',
        zelleEmail: zelleEmail || null,
        zellePhone: zellePhone || null,
        cashappTag: cashappTag || null,
        user: {
          create: {
            name,
            email,
            password: hashedPassword,
            role: normalizedRole || 'BARBER',
            image: profileImage || null,
          },
        },
      },
      include: {
        user: true,
      },
    });

    // Create default availability schedule for the new barber
    await createDefaultAvailability(barber.id);

    return NextResponse.json({ barber }, { status: 201 });
  } catch (error) {
    console.error('Error creating barber:', error);
    return NextResponse.json({ error: 'Failed to create barber' }, { status: 500 });
  }
}
