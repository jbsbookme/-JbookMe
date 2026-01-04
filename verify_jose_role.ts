import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const jose = await prisma.user.findUnique({
    where: { email: 'jose.rodriguez@barberia.com' },
    include: { barber: true },
  });

  console.log('📋 JOSÉ DATA:');
  console.log('Email:', jose?.email);
  console.log('Role:', jose?.role);
  console.log('Has Barber profile?', jose?.barber ? 'YES ✅' : 'NO ❌');
  
  if (jose?.role !== 'BARBER') {
    console.log('\n❌ PROBLEMA: José NO tiene rol de BARBER');
    console.log('⚙️ Corrigiendo...');
    await prisma.user.update({
      where: { email: 'jose.rodriguez@barberia.com' },
      data: { role: 'BARBER' },
    });
    console.log('✅ Role actualizado a BARBER');
  } else {
    console.log('\n✅ José tiene el rol correcto: BARBER');
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
