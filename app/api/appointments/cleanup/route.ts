import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AppointmentStatus } from '@prisma/client';

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
 * Cleanup old appointments - Delete cancelled/completed/no-show appointments after 24 hours
 * This endpoint should be called by a cron job or scheduled task
 */
type CleanupResult = {
  cutoff: Date;
  cancelledCount: number;
  completedOrNoShowCount: number;
  total: number;
};

async function computeCleanup(cutoff: Date) {
  const cancelledCount = await prisma.appointment.count({
    where: {
      OR: [
        {
          status: AppointmentStatus.CANCELLED,
          cancelledAt: {
            lt: cutoff,
          },
        },
        {
          status: AppointmentStatus.CANCELLED,
          cancelledAt: null,
          updatedAt: {
            lt: cutoff,
          },
        },
      ],
    },
  });

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

  return { cancelledCount, completedIds };
}

async function runCleanup(cutoff: Date): Promise<CleanupResult> {
  const { completedIds, cancelledCount } = await computeCleanup(cutoff);

  const cancelledResult = await prisma.appointment.deleteMany({
    where: {
      OR: [
        {
          status: AppointmentStatus.CANCELLED,
          cancelledAt: {
            lt: cutoff,
          },
        },
        {
          status: AppointmentStatus.CANCELLED,
          cancelledAt: null,
          updatedAt: {
            lt: cutoff,
          },
        },
      ],
    },
  });

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

export async function POST() {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    console.log('🧹 Running appointment cleanup (POST). Cutoff:', cutoff.toISOString());

    const result = await runCleanup(cutoff);

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
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // If called by Vercel Cron (GET), run the real cleanup.
    if (isAuthorizedCron(req)) {
      console.log('🧹 Running appointment cleanup (GET cron). Cutoff:', cutoff.toISOString());
      const result = await runCleanup(cutoff);
      return NextResponse.json({
        success: true,
        message: `Cleaned up ${result.total} old appointments`,
        deletedCount: result.total,
        deletedBreakdown: {
          cancelled: result.cancelledCount,
          completedOrNoShow: result.completedOrNoShowCount,
        },
        cutoffDate: result.cutoff.toISOString(),
      });
    }

    const { cancelledCount, completedIds } = await computeCleanup(cutoff);
    const total = cancelledCount + completedIds.length;

    return NextResponse.json({
      appointmentsToCleanup: total,
      breakdown: {
        cancelled: cancelledCount,
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
