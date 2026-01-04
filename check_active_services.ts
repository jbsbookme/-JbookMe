import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n=== SERVICIOS ACTIVOS ===\n');
  
  const barbers = await prisma.barber.findMany({
    include: {
      user: { select: { name: true } },
      services: {
        where: { isActive: true },
        select: { name: true, gender: true, price: true }
      }
    }
  });
  
  barbers.forEach(b => {
    if (b.services.length > 0) {
      console.log(`\n${b.user.name} (${b.gender}):`);
      console.log(`  Total: ${b.services.length} servicios`);
      b.services.forEach(s => {
        console.log(`    - ${s.name} (${s.gender}) - $${s.price}`);
      });
    }
  });
  
  const generalServices = await prisma.service.findMany({
    where: { barberId: null, isActive: true },
    select: { name: true, gender: true, price: true }
  });
  
  console.log(`\n\nSERVICIOS GENERALES (sin barbero): ${generalServices.length}`);
  generalServices.forEach(s => {
    console.log(`  - ${s.name} (${s.gender}) - $${s.price}`);
  });
  
  console.log('\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
