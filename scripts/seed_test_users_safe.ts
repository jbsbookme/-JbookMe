import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type TestUserSpec = {
  email: string;
  password: string;
  role: Role;
  name: string;
};

const ADMIN_EMAIL =
  process.env.TEST_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@barberia.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'Admin2024!';
const ADMIN_NAME = process.env.TEST_ADMIN_NAME || 'Administrador Principal';

const TEST_USERS: TestUserSpec[] = [
  {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: Role.ADMIN,
    name: ADMIN_NAME,
  },
  {
    email: 'maria.garcia@example.com',
    password: 'client123',
    role: Role.CLIENT,
    name: 'María García',
  },
  {
    email: 'miguel.santos@barberia.com',
    password: 'barber123',
    role: Role.BARBER,
    name: 'Miguel Santos',
  },
];

function looksLikeBcryptHash(value: string | null | undefined) {
  if (!value) return false;
  return value.startsWith('$2a$') || value.startsWith('$2b$') || value.startsWith('$2y$');
}

async function upsertTestUser(spec: TestUserSpec) {
  const existing = await prisma.user.findUnique({
    where: { email: spec.email },
    select: { id: true, email: true, role: true, password: true, name: true },
  });

  // Only set/overwrite password if missing or clearly not a bcrypt hash.
  const shouldSetPassword = !looksLikeBcryptHash(existing?.password);
  const hashedPassword = shouldSetPassword ? await bcrypt.hash(spec.password, 10) : undefined;

  if (!existing) {
    const created = await prisma.user.create({
      data: {
        email: spec.email,
        password: await bcrypt.hash(spec.password, 10),
        name: spec.name,
        role: spec.role,
      },
      select: { id: true, email: true, role: true },
    });

    return {
      action: 'created' as const,
      user: created,
      passwordUpdated: true,
      roleUpdated: true,
    };
  }

  const roleDifferent = existing.role !== spec.role;
  const nameMissing = !existing.name || existing.name.trim().length === 0;

  const updated = await prisma.user.update({
    where: { email: spec.email },
    data: {
      ...(roleDifferent ? { role: spec.role } : {}),
      ...(shouldSetPassword ? { password: hashedPassword } : {}),
      // Keep name stable unless empty
      ...(spec.name && nameMissing ? { name: spec.name } : {}),
    },
    select: { id: true, email: true, role: true },
  });

  return {
    action: 'updated' as const,
    user: updated,
    passwordUpdated: shouldSetPassword,
    roleUpdated: roleDifferent,
  };
}

async function ensureBarberProfileForUserEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, barber: { select: { id: true } } },
  });

  if (!user) return { action: 'skipped' as const, reason: 'user_not_found' as const };
  if (user.role !== Role.BARBER) return { action: 'skipped' as const, reason: 'not_barber_role' as const };
  if (user.barber?.id) return { action: 'exists' as const, barberId: user.barber.id };

  const created = await prisma.barber.create({
    data: { userId: user.id, isActive: true },
    select: { id: true },
  });

  return { action: 'created' as const, barberId: created.id };
}

async function main() {
  console.log('🧩 Safe seed (Neon): upsert test users (no truncate)');

  for (const spec of TEST_USERS) {
    const result = await upsertTestUser(spec);
    console.log(`[user] ${spec.email}`, result);

    if (spec.role === Role.BARBER) {
      const barberResult = await ensureBarberProfileForUserEmail(spec.email);
      console.log(`[barber] ${spec.email}`, barberResult);
    }
  }

  console.log('✅ Done. You can now login with:');
  console.log(`- ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log('- maria.garcia@example.com / client123');
  console.log('- miguel.santos@barberia.com / barber123');
}

main()
  .catch((e) => {
    console.error('❌ Safe seed failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
