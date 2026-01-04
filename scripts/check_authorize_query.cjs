const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  const email = 'miguel.santos@barberia.com';
  const user = await prisma.user.findUnique({
    where: { email },
    include: { barber: true },
  });
  console.log('found user', Boolean(user), user ? { id: user.id, role: user.role, barberId: user.barber?.id ?? null } : null);
})()
  .catch((e) => {
    console.error('authorize-like query failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
