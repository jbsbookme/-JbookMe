import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Activar un servicio MALE general para prueba
  const service = await prisma.service.findFirst({
    where: { 
      name: 'Haircut',
      gender: 'MALE',
      barberId: null,
      isActive: false
    }
  });
  
  if (service) {
    await prisma.service.update({
      where: { id: service.id },
      data: { isActive: true }
    });
    console.log('✅ Servicio "Haircut" (MALE) activado temporalmente para prueba');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
