import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

function normalizePhone(input: string): string {
  return input.replace(/[\s\-()]/g, '');
}

function isValidE164(phone: string): boolean {
  return /^\+?[1-9]\d{1,14}$/.test(phone);
}

// GET all users (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        barber: {
          select: {
            id: true,
            specialties: true,
            bio: true,
            profileImage: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            appointmentsAsClient: true,
            posts: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' },  // ADMIN first, then BARBER, then CLIENT
        { createdAt: 'desc' },
      ],
    });

    console.log('[ADMIN USERS API] Total users found:', users.length);

    // Transform _count to appointments and use barber image if user has no image
    const transformedUsers = users.map((user) => ({
      ...user,
      image: user.image || user.barber?.profileImage || null,
      _count: {
        appointments: user._count.appointmentsAsClient,
        reviews: 0, // Not included in query for performance
        posts: user._count.posts,
      },
    }));

    console.log('[ADMIN USERS API] Sending response with', transformedUsers.length, 'users');
    console.log('[ADMIN USERS API] Sample user data:', JSON.stringify(transformedUsers[0], null, 2));
    console.log('[ADMIN USERS API] Roles in response:', transformedUsers.map(u => `${u.name}: ${u.role}`));
    return NextResponse.json({ users: transformedUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST create new user (admin only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, password, role, phone } = body;

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Validate role
    if (role && !['CLIENT', 'BARBER', 'ADMIN'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'This email is already in use' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    let normalizedPhone: string | null = null;
    if (typeof phone === 'string' && phone.trim() !== '') {
      const candidate = normalizePhone(phone.trim());
      if (!isValidE164(candidate)) {
        return NextResponse.json(
          { error: 'Invalid phone number. Use E.164 format (e.g., +17813677244)' },
          { status: 400 }
        );
      }
      normalizedPhone = candidate;
    }

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'CLIENT',
        phone: normalizedPhone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    console.log('[ADMIN USERS API] New user created:', newUser.email, 'with role:', newUser.role);

    return NextResponse.json({
      message: 'User created successfully',
      user: newUser,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
