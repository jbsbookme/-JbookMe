import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import type { Prisma, Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

function normalizePhone(input: string): string {
  return input.replace(/[\s\-()]/g, '');
}

function isValidE164(phone: string): boolean {
  return /^\+?[1-9]\d{1,14}$/.test(phone);
}

// GET user details (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        barber: {
          include: {
            services: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
            _count: {
              select: {
                appointments: true,
                reviews: true,
              },
            },
          },
        },
        appointmentsAsClient: {
          include: {
            service: {
              select: {
                name: true,
              },
            },
            barber: {
              select: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            date: 'desc',
          },
          take: 10,
        },
        reviewsGiven: {
          include: {
            barber: {
              select: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        posts: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
        _count: {
          select: {
            appointmentsAsClient: true,
            reviewsGiven: true,
            posts: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json({ error: 'Failed to fetch user details' }, { status: 500 });
  }
}

// PUT update user (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id;
    const body = await request.json();
    const { name, email, role, password, phone } = body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Define the owner/super admin email
    const OWNER_EMAIL = 'admin@barberia.com';
    const isOwner = session.user.email === OWNER_EMAIL;

    // Prevent editing ADMIN users unless:
    // 1. You are the owner (super admin)
    // 2. You are editing yourself
    if (existingUser.role === 'ADMIN' && !isOwner && existingUser.id !== session.user.id) {
      return NextResponse.json(
        { error: 'You cannot edit other admin users' },
        { status: 400 }
      );
    }

    // If email is being changed, check if it's already in use
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: 'This email is already in use' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: Prisma.UserUpdateInput = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined && ['CLIENT', 'BARBER', 'ADMIN'].includes(role)) {
      updateData.role = role as Role;
    }

    if (phone !== undefined) {
      if (phone === null || phone === '') {
        updateData.phone = null;
      } else if (typeof phone === 'string') {
        const candidate = normalizePhone(phone.trim());
        if (candidate !== '' && !isValidE164(candidate)) {
          return NextResponse.json(
            { error: 'Invalid phone number. Use E.164 format (e.g., +17813677244)' },
            { status: 400 }
          );
        }
        updateData.phone = candidate === '' ? null : candidate;
      }
    }

    // Hash password if provided
    if (password && password.length >= 6) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE user (admin only) - Permanent deletion with safety checks
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        barber: true,
        appointmentsAsClient: {
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED'],
            },
          },
        },
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Define the owner/super admin email
    const OWNER_EMAIL = 'admin@barberia.com';
    const isOwner = session.user.email === OWNER_EMAIL;

    // Prevent deleting ADMIN users unless:
    // 1. You are the owner (super admin) - but you cannot delete yourself
    if (existingUser.role === 'ADMIN') {
      if (existingUser.id === session.user.id) {
        return NextResponse.json(
          { error: 'You cannot delete your own account' },
          { status: 400 }
        );
      }
      if (!isOwner) {
        return NextResponse.json(
          { error: 'Admin users cannot be deleted' },
          { status: 400 }
        );
      }
    }

    // Prevent deleting users who are barbers
    if (existingUser.barber) {
      return NextResponse.json(
        {
          error:
            'This user is a barber. Please delete them from the Barbers or Stylists section.',
        },
        { status: 400 }
      );
    }

    // STEP 1: Cancel all active appointments automatically
    if (existingUser.appointmentsAsClient.length > 0) {
      await prisma.appointment.updateMany({
        where: {
          clientId: userId,
          status: {
            in: ['PENDING', 'CONFIRMED'],
          },
        },
        data: {
          status: 'CANCELLED',
          notes: 'Appointment automatically cancelled - User deleted by admin',
        },
      });
    }

    // STEP 2: Delete all related records
    // OAuth accounts
    await prisma.account.deleteMany({
      where: { userId },
    });

    // Sessions
    await prisma.session.deleteMany({
      where: { userId },
    });

    // All appointments (now all are cancelled or completed)
    await prisma.appointment.deleteMany({
      where: { clientId: userId },
    });

    // Reviews given by user
    await prisma.review.deleteMany({
      where: { clientId: userId },
    });

    // Posts
    await prisma.post.deleteMany({
      where: { authorId: userId },
    });

    // Comments
    await prisma.comment.deleteMany({
      where: { authorId: userId },
    });

    // Messages
    await prisma.message.deleteMany({
      where: {
        OR: [
          { senderId: userId },
          { recipientId: userId },
        ],
      },
    });

    // Notifications
    await prisma.notification.deleteMany({
      where: { userId },
    });

    // Push subscriptions
    await prisma.pushSubscription.deleteMany({
      where: { userId },
    });

    // Invoices
    await prisma.invoice.deleteMany({
      where: { recipientId: userId },
    });

    // STEP 3: Finally, delete the user
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
