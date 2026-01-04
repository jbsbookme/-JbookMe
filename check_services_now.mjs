import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 ANALIZANDO SERVICIOS ACTUALES...\n');
  
  const allServices = await prisma.service.findMany({
    where: { isActive: true },
    include: {
      barber: {
        include: {
          user: { select: { name: true } }
        }
      }
    },
    orderBy: [{ gender: 'asc' }, { name: 'asc' }]
  });
  
  const male = allServices.filter(s => s.gender === 'MALE');
  const female = allServices.filter(s => s.gender === 'FEMALE');
  const unisex = allServices.filter(s => s.gender === 'UNISEX');
  
  console.log(`📊 TOTAL: ${allServices.length} servicios activos\n`);
  
  console.log(`👨 SERVICIOS MALE (${male.length}):`);
  male.forEach(s => {
    const info = s.barber ? s.barber.user.name : '⭐ GENERAL';
    console.log(`  - ${s.name} ($${s.price}) - ${info}`);
  });
  
  console.log(`\n👩 SERVICIOS FEMALE (${female.length}):`);
  female.forEach(s => {
    const info = s.barber ? s.barber.user.name : '⭐ GENERAL';
    console.log(`  - ${s.name} ($${s.price}) - ${info}`);
  });
  
  console.log(`\n⚧ SERVICIOS UNISEX (${unisex.length}):`);
  unisex.forEach(s => {
    const info = s.barber ? s.barber.user.name : '⭐ GENERAL';
    console.log(`  - ${s.name} ($${s.price}) - ${info}`);
  });
  
  console.log('\n\n👥 BARBEROS/ESTILISTAS:');
  const barbers = await prisma.barber.findMany({
    include: {
      user: { select: { name: true, email: true } }
    }
  });
  
  barbers.forEach(b => {
    console.log(`  - ${b.user.name} (${b.gender})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
