import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const barbers = await prisma.barber.findMany({
    select: {
      id: true,
      gender: true,
      isActive: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        }
      }
    }
  });
  
  console.log('Barberos en la base de datos:');
  barbers.forEach(b => {
    console.log(
      `- ${b.user.name} (${b.user.email}) - role=${b.user.role} - active=${b.isActive} - gender=${b.gender} - barberId=${b.id} - userId=${b.user.id}`
    );
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
