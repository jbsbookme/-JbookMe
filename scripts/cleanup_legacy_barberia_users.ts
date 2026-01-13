import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type UserToDelete = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  barber: { id: string } | null;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function deleteLegacyUser(user: UserToDelete) {
  const userId = user.id;
  const barberId = user.barber?.id;

  // Cancel appointments first (client OR barber)
  await prisma.appointment.updateMany({
    where: {
      OR: [
        { clientId: userId },
        ...(barberId ? [{ barberId }] : []),
      ],
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    data: {
      status: 'CANCELLED',
      notes: 'Appointment automatically cancelled - Legacy @barberia.com cleanup',
    },
  });

  // Collect appointment/payment ids to safely delete invoices
  const appointmentIds = await prisma.appointment
    .findMany({
      where: {
        OR: [
          { clientId: userId },
          ...(barberId ? [{ barberId }] : []),
        ],
      },
      select: { id: true },
    })
    .then((rows) => rows.map((r) => r.id));

  const barberPaymentIds = barberId
    ? await prisma.barberPayment
        .findMany({ where: { barberId }, select: { id: true } })
        .then((rows) => rows.map((r) => r.id))
    : [];

  await prisma.invoice.deleteMany({
    where: {
      OR: [
        { recipientId: userId },
        ...(appointmentIds.length ? [{ appointmentId: { in: appointmentIds } }] : []),
        ...(barberPaymentIds.length ? [{ barberPaymentId: { in: barberPaymentIds } }] : []),
      ],
    },
  });

  // Likes / clicks not covered by cascades
  await prisma.postLike.deleteMany({ where: { userId } });
  await prisma.galleryLike.deleteMany({ where: { userId } });
  await prisma.socialMediaClick.deleteMany({
    where: {
      OR: [{ userId }, { barberId: userId }],
    },
  });

  // If barber: delete barber-scoped records first
  if (barberId) {
    await prisma.barberMedia.deleteMany({ where: { barberId } });
    await prisma.galleryImage.deleteMany({ where: { barberId } });
    await prisma.availability.deleteMany({ where: { barberId } });
    await prisma.dayOff.deleteMany({ where: { barberId } });

    // Posts that might point at this barber
    await prisma.post.deleteMany({ where: { barberId } });

    // Appointments + reviews where this barber is provider
    await prisma.review.deleteMany({ where: { barberId } });
    await prisma.appointment.deleteMany({ where: { barberId } });

    // Payments
    await prisma.manualPayment.deleteMany({ where: { barberId } });
    await prisma.barberPayment.deleteMany({ where: { barberId } });

    // Detach & deactivate services that belonged to this barber
    await prisma.service.updateMany({
      where: { barberId },
      data: { barberId: null, isActive: false },
    });

    // Finally delete the barber profile
    await prisma.barber.delete({ where: { id: barberId } });
  }

  // User-scoped records (mirror admin delete route)
  await prisma.account.deleteMany({ where: { userId } });
  await prisma.session.deleteMany({ where: { userId } });
  await prisma.appointment.deleteMany({ where: { clientId: userId } });
  await prisma.review.deleteMany({ where: { clientId: userId } });
  await prisma.post.deleteMany({ where: { authorId: userId } });
  await prisma.comment.deleteMany({ where: { authorId: userId } });
  await prisma.message.deleteMany({
    where: {
      OR: [{ senderId: userId }, { recipientId: userId }],
    },
  });
  await prisma.notification.deleteMany({ where: { userId } });
  await prisma.pushSubscription.deleteMany({ where: { userId } });

  // Invoices already handled earlier, but keep this for safety
  await prisma.invoice.deleteMany({ where: { recipientId: userId } });

  await prisma.user.delete({ where: { id: userId } });
}

async function main() {
  const ownerEmail = normalizeEmail(process.env.OWNER_EMAIL || '');

  const candidates = await prisma.user.findMany({
    where: {
      email: { endsWith: '@barberia.com', mode: 'insensitive' },
      role: { not: 'ADMIN' },
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      barber: { select: { id: true } },
    },
    orderBy: { email: 'asc' },
  });

  const users = candidates
    .map((u) => ({ ...u, email: normalizeEmail(u.email) }))
    .filter((u) => u.email !== ownerEmail);

  console.log(`Found ${users.length} legacy @barberia.com users (excluding admins/owner).`);
  for (const u of users) {
    console.log(`- ${u.email} | role=${u.role} | barber=${u.barber ? 'yes' : 'no'} | id=${u.id}`);
  }

  const confirm = (process.env.CONFIRM_CLEANUP || '').trim().toUpperCase();
  if (confirm !== 'YES') {
    console.log('Dry-run only. Set CONFIRM_CLEANUP=YES to actually delete these users.');
    return;
  }

  for (const u of users) {
    console.log(`\n[CLEANUP] Deleting: ${u.email} (${u.id})`);
    await deleteLegacyUser(u);
    console.log(`[CLEANUP] Deleted: ${u.email}`);
  }

  console.log('\nCleanup completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
