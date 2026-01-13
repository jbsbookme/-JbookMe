import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AppointmentStatus } from '@prisma/client';
import { processPromotions } from '@/lib/cron/promotions';

function parseHoursMinutes(time: string): { hours: number; minutes: number } | null {
  const match = time.trim().match(/^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?\s*$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const ampm = match[4]?.toUpperCase();

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  if (ampm) {
    if (ampm === 'AM') {
      hours = hours === 12 ? 0 : hours;
    } else {
      hours = hours === 12 ? 12 : hours + 12;
    }
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

function getAppointmentDateTime(date: Date, time: string): Date | null {
  const parsed = parseHoursMinutes(time);
  if (!parsed) return null;
  const d = new Date(date);
  d.setHours(parsed.hours, parsed.minutes, 0, 0);
  return d;
}

/**
 * Cleanup old appointments - Delete cancelled/completed/no-show appointments after 48 hours
 * This endpoint should be called by a cron job or scheduled task
 */
type CleanupResult = {
  cutoff: Date;
  cancelledCount: number;
  completedOrNoShowCount: number;
  total: number;
};

async function computeCleanup(cutoff: Date) {
  const cancelledCandidates = await prisma.appointment.findMany({
    where: {
      status: AppointmentStatus.CANCELLED,
      date: {
        lte: cutoff,
      },
    },
    select: {
      id: true,
      date: true,
      time: true,
      cancelledAt: true,
      updatedAt: true,
    },
  });

  const cancelledIds = cancelledCandidates
    .map((a) => {
      const aptDateTime = getAppointmentDateTime(a.date, a.time);
      const aptOldEnough = aptDateTime ? aptDateTime < cutoff : a.date < cutoff;
      const cancelledOldEnough = a.cancelledAt ? a.cancelledAt < cutoff : a.updatedAt < cutoff;
      return aptOldEnough || cancelledOldEnough ? a.id : null;
    })
    .filter((id): id is string => Boolean(id));

  const completedCandidates = await prisma.appointment.findMany({
    where: {
      status: {
        in: [AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW],
      },
      date: {
        lte: cutoff,
      },
    },
    select: {
      id: true,
      date: true,
      time: true,
    },
  });

  const completedIds = completedCandidates
    .map((a) => {
      const aptDateTime = getAppointmentDateTime(a.date, a.time);
      if (!aptDateTime) return null;
      return aptDateTime < cutoff ? a.id : null;
    })
    .filter((id): id is string => Boolean(id));

  return { cancelledIds, completedIds };
}

async function runCleanup(cutoff: Date): Promise<CleanupResult> {
  const { completedIds, cancelledIds } = await computeCleanup(cutoff);

  const cancelledResult = cancelledIds.length
    ? await prisma.appointment.deleteMany({
        where: {
          id: {
            in: cancelledIds,
          },
        },
      })
    : { count: 0 };

  const completedResult = completedIds.length
    ? await prisma.appointment.deleteMany({
        where: {
          id: {
            in: completedIds,
          },
        },
      })
    : { count: 0 };

  return {
    cutoff,
    cancelledCount: cancelledResult.count,
    completedOrNoShowCount: completedResult.count,
    total: cancelledResult.count + completedResult.count,
  };
}

function isAuthorizedCron(req: Request): boolean {
  // Vercel Cron requests include this header.
  const vercelCron = req.headers.get('x-vercel-cron');
  if (vercelCron === '1' || vercelCron === 'true') return true;

  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.get('authorization');
  if (authHeader === `Bearer ${secret}`) return true;

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (token && token === secret) return true;
  } catch {
    // ignore
  }

  return false;
}

export async function POST(req: Request) {
  try {
    if (!isAuthorizedCron(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    console.log('🧹 Running appointment cleanup (POST). Cutoff:', cutoff.toISOString());

    const result = await runCleanup(cutoff);
    const promotionsResult = await processPromotions(new Date());

    console.log(
      `✓ Cleaned up ${result.total} old appointments (cancelled=${result.cancelledCount}, completed/no-show=${result.completedOrNoShowCount})`
    );

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${result.total} old appointments`,
      deletedCount: result.total,
      deletedBreakdown: {
        cancelled: result.cancelledCount,
        completedOrNoShow: result.completedOrNoShowCount,
      },
      cutoffDate: result.cutoff.toISOString(),
      promotions: promotionsResult,
    });
  } catch (error) {
    console.error('Error cleaning up appointments:', error);
    return NextResponse.json(
      { error: 'Failed to clean up old appointments' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check how many appointments would be deleted (dry run)
 */
export async function GET(req: Request) {
  try {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // If called by Vercel Cron (GET), run the real cleanup.
    if (isAuthorizedCron(req)) {
      console.log('🧹 Running appointment cleanup (GET cron). Cutoff:', cutoff.toISOString());
      const result = await runCleanup(cutoff);
      const promotionsResult = await processPromotions(new Date());
      return NextResponse.json({
        success: true,
        message: `Cleaned up ${result.total} old appointments`,
        deletedCount: result.total,
        deletedBreakdown: {
          cancelled: result.cancelledCount,
          completedOrNoShow: result.completedOrNoShowCount,
        },
        cutoffDate: result.cutoff.toISOString(),
        promotions: promotionsResult,
      });
    }

    const { cancelledIds, completedIds } = await computeCleanup(cutoff);
    const total = cancelledIds.length + completedIds.length;

    return NextResponse.json({
      appointmentsToCleanup: total,
      breakdown: {
        cancelled: cancelledIds.length,
        completedOrNoShow: completedIds.length,
      },
      cutoffDate: cutoff.toISOString(),
      message: `There are ${total} old appointments ready for cleanup`,
      note: 'Dry run (use CRON to execute deletion).',
    });
  } catch (error) {
    console.error('Error checking appointments for cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to check old appointments for cleanup' },
      { status: 500 }
    );
  }
}
