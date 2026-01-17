const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const adminEmail = process.env.ADMIN_EMAIL || process.env.OWNER_EMAIL || 'admin@barberia.com';

(async () => {
  const emails = [
    adminEmail,
    'maria.garcia@example.com',
    'miguel.santos@barberia.com',
  ];

  for (const email of emails) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, password: true },
    });

    if (!user) {
      console.log(email, null);
      continue;
    }

    console.log(email, {
      id: user.id,
      role: user.role,
      hasPassword: Boolean(user.password),
      passwordPrefix: (user.password ?? '').slice(0, 4),
    });
  }
})()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
