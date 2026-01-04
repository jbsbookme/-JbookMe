import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 ANALIZANDO SERVICIOS ACTUALES...\n');
  
  // Obtener todos los servicios activos
  const allServices = await prisma.service.findMany({
    where: { isActive: true },
    include: {
      barber: {
        include: {
          user: { select: { name: true, email: true } }
        }
      }
    },
    orderBy: [{ gender: 'asc' }, { name: 'asc' }]
  });
  
  const male = allServices.filter(s => s.gender === 'MALE');
  const female = allServices.filter(s => s.gender === 'FEMALE');
  const unisex = allServices.filter(s => s.gender === 'UNISEX');
  
  console.log(`📊 TOTAL SERVICIOS ACTIVOS: ${allServices.length}\n`);
  
  console.log(`👨 SERVICIOS MALE (${male.length}):`);
  male.forEach(s => {
    const barberInfo = s.barber ? `${s.barber.user.name}` : '⭐ GENERAL';
    console.log(`  - ${s.name} ($${s.price}) - ${barberInfo}`);
  });
  
  console.log(`\n👩 SERVICIOS FEMALE (${female.length}):`);
  female.forEach(s => {
    const barberInfo = s.barber ? `${s.barber.user.name}` : '⭐ GENERAL';
    console.log(`  - ${s.name} ($${s.price}) - ${barberInfo}`);
  });
  
  console.log(`\n⚧ SERVICIOS UNISEX (${unisex.length}):`);
  unisex.forEach(s => {
    const barberInfo = s.barber ? `${s.barber.user.name}` : '⭐ GENERAL';
    console.log(`  - ${s.name} ($${s.price}) - ${barberInfo}`);
  });
  
  // Obtener barberos
  console.log('\n\n👥 BARBEROS/ESTILISTAS:');
  const barbers = await prisma.barber.findMany({
    include: {
      user: { select: { name: true, email: true } }
    }
  });
  
  barbers.forEach(b => {
    console.log(`  - ${b.user.name} (${b.gender}) - ${b.user.email}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
