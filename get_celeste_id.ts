import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const celeste = await prisma.barber.findFirst({
    where: { user: { email: 'Celestebookme@gmail.com' } },
    include: { user: true }
  });
  
  if (celeste) {
    console.log('Celeste ID:', celeste.id);
    console.log('Gender:', celeste.gender);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
