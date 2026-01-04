import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { PromotionStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/promotions
 * Get all promotions (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    console.log('[API PROMOTIONS] GET request with status filter:', status);

    const where: Prisma.PromotionWhereInput = {};
    if (status && status !== 'ALL') {
      if (status === 'INACTIVE') {
        where.status = { not: PromotionStatus.ACTIVE };
      } else if (Object.values(PromotionStatus).includes(status as PromotionStatus)) {
        where.status = status as PromotionStatus;
      }
    }

    const promotions = await prisma.promotion.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('[API PROMOTIONS] Found', promotions.length, 'promotions');
    console.log('[API PROMOTIONS] Sample:', promotions[0]);

    return NextResponse.json({ promotions });
  } catch (error) {
    console.error('[API PROMOTIONS] Error fetching promotions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch promotions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/promotions
 * Create a new promotion (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API PROMOTIONS POST] Starting...');
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      console.log('[API PROMOTIONS POST] Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[API PROMOTIONS POST] User authorized:', session.user.email);

    const body = await request.json();
    console.log('[API PROMOTIONS POST] Request body:', body);
    
    const {
      title,
      message,
      discount,
      startDate,
      endDate,
      targetRole,
      sendNow,
      notificationType = 'both',
    } = body;

    // Validate required fields
    if (!title || !message || !startDate || !endDate) {
      console.log('[API PROMOTIONS POST] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    console.log('[API PROMOTIONS POST] Dates parsed:', { start, end });

    if (end <= start) {
      console.log('[API PROMOTIONS POST] Invalid date range');
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Determine initial status
    const now = new Date();
    const computedStatus: PromotionStatus =
      now < start
        ? PromotionStatus.SCHEDULED
        : now > end
          ? PromotionStatus.EXPIRED
          : PromotionStatus.ACTIVE;
    const isActive = computedStatus === 'ACTIVE';
    console.log('[API PROMOTIONS POST] Determined status:', computedStatus);

    // Create promotion
    console.log('[API PROMOTIONS POST] Creating promotion in DB...');
    const promotion = await prisma.promotion.create({
      data: {
        title,
        message,
        discount: discount !== undefined && discount !== null && String(discount).trim() !== '' ? String(discount) : undefined,
        startDate: start,
        endDate: end,
        status: computedStatus,
        targetRole: targetRole && targetRole !== 'ALL' ? targetRole : undefined,
        createdBy: (session.user as any)?.id,
      },
    });
    console.log('[API PROMOTIONS POST] Promotion created:', promotion.id);

    // Send notifications immediately if requested and promotion is active
    if (sendNow && isActive) {
      const whereClause: Prisma.UserWhereInput = {};
      if (targetRole && targetRole !== 'ALL') {
        whereClause.role = targetRole;
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      let sentCount = 0;

      // Send emails
      if (notificationType === 'email' || notificationType === 'both') {
        for (const user of users) {
          try {
            const emailBody = `Hello ${user.name || 'User'},\n\n${message}${
              discount ? `\n\n💰 Discount: ${discount}` : ''
            }\n\n📅 Valid until: ${end.toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}\n\n---\nThis message was sent by JBookMe.`;

            const ok = await sendEmail({
              to: user.email,
              subject: `🎉 ${title}`,
              body: emailBody,
            });
            if (ok) sentCount++;
          } catch (error) {
            console.error(`Error sending email to ${user.email}:`, error);
          }
        }
      }

      // Create in-app notifications
      if (notificationType === 'notification' || notificationType === 'both') {
        for (const user of users) {
          try {
            await prisma.notification.create({
              data: {
                userId: user.id,
                type: 'NEW_MESSAGE',
                title: `🎉 ${title}`,
                message: `${message}${discount ? ` - ${discount}` : ''}`,
                isRead: false,
              },
            });
            sentCount++;
          } catch (error) {
            console.error(`Error creating notification for ${user.id}:`, error);
          }
        }
      }

      console.log('[API PROMOTIONS POST] Notifications sent:', sentCount);

    }

    console.log('[API PROMOTIONS POST] Success! Returning promotion');
    return NextResponse.json({ promotion }, { status: 201 });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[API PROMOTIONS POST] Error creating promotion:', err);
    console.error('[API PROMOTIONS POST] Error details:', err.message);
    console.error('[API PROMOTIONS POST] Stack:', err.stack);
    return NextResponse.json(
      { error: 'Failed to create promotion', details: err.message },
      { status: 500 }
    );
  }
}
