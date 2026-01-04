import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find Sandra Paez
  const sandra = await prisma.barber.findFirst({
    where: {
      user: {
        email: 'sandra.paez@barberia.com',
      },
    },
    include: {
      user: true,
    },
  });

  if (!sandra) {
    console.log('Sandra Paez not found!');
    return;
  }

  console.log(`\n=== SANDRA PAEZ (${sandra.gender}) ===\n`);
  console.log(`User ID: ${sandra.userId}`);
  console.log(`Barber ID: ${sandra.id}\n`);

  // Get services that Sandra SHOULD see (FEMALE + UNISEX, barberId = null)
  const sandraServices = await prisma.service.findMany({
    where: {
      isActive: true,
      barberId: null,
      gender: {
        in: [sandra.gender, 'UNISEX'],
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  console.log(`Services Sandra SHOULD see (${sandra.gender} + UNISEX, General only):`);
  console.log(`Total: ${sandraServices.length}\n`);
  
  sandraServices.forEach(s => {
    console.log(`   - ${s.name} ($${s.price}) [${s.gender}]`);
  });

  // Now check for Celeste
  const celeste = await prisma.barber.findFirst({
    where: {
      user: {
        email: 'celeste.paulino@barberia.com',
      },
    },
    include: {
      user: true,
    },
  });

  if (!celeste) {
    console.log('\nCeleste Paulino not found!');
    return;
  }

  console.log(`\n\n=== CELESTE PAULINO (${celeste.gender}) ===\n`);
  console.log(`User ID: ${celeste.userId}`);
  console.log(`Barber ID: ${celeste.id}\n`);

  const celesteServices = await prisma.service.findMany({
    where: {
      isActive: true,
      barberId: null,
      gender: {
        in: [celeste.gender, 'UNISEX'],
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  console.log(`Services Celeste SHOULD see (${celeste.gender} + UNISEX, General only):`);
  console.log(`Total: ${celesteServices.length}\n`);
  
  celesteServices.forEach(s => {
    console.log(`   - ${s.name} ($${s.price}) [${s.gender}]`);
  });

  console.log('\n=== END ===\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
