import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseEmailList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.toLowerCase());
}

async function main() {
  const ownerEmailRaw = process.env.OWNER_EMAIL;
  if (!ownerEmailRaw) {
    throw new Error('Missing env OWNER_EMAIL');
  }

  const ownerEmail = ownerEmailRaw.trim().toLowerCase();
  const barberEmails = parseEmailList(process.env.BARBER_EMAILS);
  const stylistEmails = parseEmailList(process.env.STYLIST_EMAILS);

  const staffEmails = Array.from(new Set([...barberEmails, ...stylistEmails]));
  const targetEmails = Array.from(new Set([ownerEmail, ...staffEmails]));

  console.log('[sync_staff_roles] OWNER_EMAIL:', ownerEmail);
  console.log('[sync_staff_roles] BARBER_EMAILS:', barberEmails.join(', ') || '(none)');
  console.log('[sync_staff_roles] STYLIST_EMAILS:', stylistEmails.join(', ') || '(none)');

  const users = await prisma.user.findMany({
    where: { email: { in: targetEmails } },
    select: { id: true, email: true, role: true },
  });

  const usersByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));
  const missing = targetEmails.filter((e) => !usersByEmail.has(e));

  if (missing.length > 0) {
    console.log('[sync_staff_roles] Missing users (create/sign-up first):');
    for (const email of missing) console.log(' -', email);
  }

  const owner = usersByEmail.get(ownerEmail);
  if (owner) {
    if (owner.role !== 'ADMIN') {
      await prisma.user.update({ where: { id: owner.id }, data: { role: 'ADMIN' } });
      console.log('[sync_staff_roles] Set owner role -> ADMIN:', ownerEmail);
    } else {
      console.log('[sync_staff_roles] Owner already ADMIN:', ownerEmail);
    }
  }

  for (const email of staffEmails) {
    const user = usersByEmail.get(email);
    if (!user) continue;

    if (email !== ownerEmail && user.role !== 'BARBER') {
      await prisma.user.update({ where: { id: user.id }, data: { role: 'BARBER' } });
      console.log('[sync_staff_roles] Set staff role -> BARBER:', email);
    }

    const isStylist = stylistEmails.includes(email);
    const desiredGender = isStylist ? 'FEMALE' : 'MALE';

    await prisma.barber.upsert({
      where: { userId: user.id },
      update: { isActive: true, gender: desiredGender },
      create: { userId: user.id, isActive: true, gender: desiredGender },
    });

    console.log(
      `[sync_staff_roles] Ensured Barber profile (active, gender=${desiredGender}): ${email}`
    );
  }

  // Enforce: only OWNER_EMAIL stays ADMIN
  const otherAdmins = await prisma.user.findMany({
    where: { role: 'ADMIN', email: { not: ownerEmailRaw } },
    select: { id: true, email: true },
  });

  for (const admin of otherAdmins) {
    await prisma.user.update({ where: { id: admin.id }, data: { role: 'CLIENT' } });
    console.log('[sync_staff_roles] Demoted other ADMIN -> CLIENT:', admin.email);
  }

  console.log('[sync_staff_roles] Done');
}

main()
  .catch((e) => {
    console.error('[sync_staff_roles] Failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
