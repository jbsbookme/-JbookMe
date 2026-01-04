import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n=== SERVICIOS POR BARBERO/ESTILISTA ===\n');
  
  const barbers = await prisma.barber.findMany({
    include: {
      user: { select: { name: true } },
      services: {
        select: {
          id: true,
          name: true,
          gender: true,
          price: true
        }
      }
    }
  });
  
  barbers.forEach(b => {
    console.log(`\n${b.user.name} (${b.gender}):`);
    console.log(`  Total servicios: ${b.services.length}`);
    if (b.services.length > 0) {
      b.services.forEach(s => {
        console.log(`    - ${s.name} (${s.gender}) - $${s.price}`);
      });
    } else {
      console.log('    (sin servicios propios)');
    }
  });
  
  // Servicios generales
  const generalServices = await prisma.service.findMany({
    where: { barberId: null },
    select: { name: true, gender: true }
  });
  
  console.log(`\n\nSERVICIOS GENERALES (sin barbero asignado): ${generalServices.length}`);
  generalServices.forEach(s => {
    console.log(`  - ${s.name} (${s.gender})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
