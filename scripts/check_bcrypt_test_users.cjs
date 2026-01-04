const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  const cases = [
    ['admin@barberia.com', 'Admin2024!'],
    ['maria.garcia@example.com', 'client123'],
    ['miguel.santos@barberia.com', 'barber123'],
  ];

  for (const [email, password] of cases) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { password: true, role: true },
    });

    const ok = user?.password ? await bcrypt.compare(password, user.password) : false;
    console.log(email, { role: user?.role ?? null, bcryptOK: ok });
  }
})()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
