import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n📋 TODOS LOS SERVICIOS (activos + inactivos):\n');
  
  const allServices = await prisma.service.findMany({
    include: {
      barber: {
        include: {
          user: { select: { name: true } }
        }
      }
    },
    orderBy: [{ isActive: 'desc' }, { gender: 'asc' }, { name: 'asc' }]
  });
  
  const active = allServices.filter(s => s.isActive);
  const inactive = allServices.filter(s => !s.isActive);
  
  console.log(`✅ ACTIVOS: ${active.length}`);
  console.log(`❌ INACTIVOS: ${inactive.length}`);
  console.log(`📊 TOTAL: ${allServices.length}\n`);
  
  console.log('=== SERVICIOS INACTIVOS ===\n');
  const inactiveMale = inactive.filter(s => s.gender === 'MALE');
  const inactiveFemale = inactive.filter(s => s.gender === 'FEMALE');
  const inactiveUnisex = inactive.filter(s => s.gender === 'UNISEX');
  
  console.log(`👨 MALE INACTIVOS (${inactiveMale.length}):`);
  inactiveMale.forEach(s => {
    const info = s.barber ? s.barber.user.name : '⭐ GENERAL';
    console.log(`  - ${s.name} ($${s.price}) - ${info}`);
  });
  
  console.log(`\n👩 FEMALE INACTIVOS (${inactiveFemale.length}):`);
  inactiveFemale.forEach(s => {
    const info = s.barber ? s.barber.user.name : '⭐ GENERAL';
    console.log(`  - ${s.name} ($${s.price}) - ${info}`);
  });
  
  console.log(`\n⚧ UNISEX INACTIVOS (${inactiveUnisex.length}):`);
  inactiveUnisex.forEach(s => {
    const info = s.barber ? s.barber.user.name : '⭐ GENERAL';
    console.log(`  - ${s.name} ($${s.price}) - ${info}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
