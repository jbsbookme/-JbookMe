import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const barbers = await prisma.barber.findMany({
    select: {
      id: true,
      gender: true,
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });
  
  console.log('Barberos en la base de datos:');
  barbers.forEach(b => {
    console.log(`- ${b.user.name} (${b.user.email}) - Atiende: ${b.gender} - ID: ${b.id}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
