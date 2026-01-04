import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n=== CHECKING ALL SERVICES ===\n');
  
  const allServices = await prisma.service.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      gender: 'asc',
    },
  });

  console.log(`Total Active Services: ${allServices.length}\n`);
  
  // Group by gender
  const byGender = {
    MALE: allServices.filter(s => s.gender === 'MALE'),
    FEMALE: allServices.filter(s => s.gender === 'FEMALE'),
    UNISEX: allServices.filter(s => s.gender === 'UNISEX'),
  };

  console.log(`📊 BREAKDOWN BY GENDER:`);
  console.log(`   MALE:   ${byGender.MALE.length} services`);
  console.log(`   FEMALE: ${byGender.FEMALE.length} services`);
  console.log(`   UNISEX: ${byGender.UNISEX.length} services\n`);

  console.log(`\n👨 MALE SERVICES:`);
  byGender.MALE.forEach(s => {
    console.log(`   - ${s.name} ($${s.price}) - barberId: ${s.barberId ? 'SPECIFIC' : 'GENERAL'}`);
  });

  console.log(`\n👩 FEMALE SERVICES:`);
  byGender.FEMALE.forEach(s => {
    console.log(`   - ${s.name} ($${s.price}) - barberId: ${s.barberId ? 'SPECIFIC' : 'GENERAL'}`);
  });

  console.log(`\n⚧ UNISEX SERVICES:`);
  byGender.UNISEX.forEach(s => {
    console.log(`   - ${s.name} ($${s.price}) - barberId: ${s.barberId ? 'SPECIFIC' : 'GENERAL'}`);
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
