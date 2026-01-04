import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { isTwilioConfigured, sendSMS } from '@/lib/twilio';

export const dynamic = 'force-dynamic';

function normalizePhone(input: string): string {
  return input.replace(/[\s\-()]/g, '');
}

function isValidE164(phone: string): boolean {
  // Basic E.164 validation
  return /^\+?[1-9]\d{1,14}$/.test(phone);
}

/**
 * POST /api/admin/users/sms
 * Send bulk SMS to selected users (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isTwilioConfigured()) {
      return NextResponse.json(
        {
          error: 'Twilio no está configurado',
          requiresConfiguration: true,
          instructions:
            'Configura TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_PHONE_NUMBER en Vercel (Environment Variables).',
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { userIds, message } = body as { userIds?: string[]; message?: string };

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'You must select at least one user' },
        { status: 400 }
      );
    }

    if (!message || message.trim() === '') {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    });

    if (users.length === 0) {
      return NextResponse.json({ error: 'No valid users found' }, { status: 404 });
    }

    let smsSent = 0;
    let usersWithNoPhone = 0;
    const errors: string[] = [];

    for (const user of users) {
      const phoneRaw = user.phone?.trim();
      if (!phoneRaw) {
        usersWithNoPhone++;
        errors.push(`User ${user.name || user.id} has no phone`);
        continue;
      }

      const to = normalizePhone(phoneRaw);
      if (!isValidE164(to)) {
        errors.push(
          `Invalid phone for ${user.name || user.id}: ${phoneRaw} (use E.164 like +17813677244)`
        );
        continue;
      }

      const result = await sendSMS(to, message);
      if (result.success) {
        smsSent++;
      } else {
        errors.push(`SMS to ${user.name || user.id} failed: ${result.error || 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      message: 'SMS processed',
      stats: {
        totalUsers: users.length,
        smsSent,
        usersWithNoPhone,
        errors: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error sending bulk SMS:', error);
    return NextResponse.json(
      { error: 'Failed to send bulk SMS' },
      { status: 500 }
    );
  }
}
