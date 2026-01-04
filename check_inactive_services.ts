import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const inactive = await prisma.service.findMany({
    where: { 
      isActive: false,
      gender: 'MALE',
      barberId: null
    },
    select: { name: true, gender: true, price: true }
  });
  
  console.log('Servicios MALE desactivados (generales):');
  inactive.forEach(s => {
    console.log(`  - ${s.name} ($${s.price})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
