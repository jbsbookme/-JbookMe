import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      gender: true,
      barber: {
        select: {
          user: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });
  
  console.log('\n=== SERVICIOS EN LA BASE DE DATOS ===\n');
  services.forEach(s => {
    const barberName = s.barber?.user?.name || 'General';
    console.log(`- ${s.name} (${s.gender}) - Barbero: ${barberName}`);
  });
  
  console.log('\n=== RESUMEN POR GÉNERO ===');
  const maleCount = services.filter(s => s.gender === 'MALE').length;
  const femaleCount = services.filter(s => s.gender === 'FEMALE').length;
  const unisexCount = services.filter(s => s.gender === 'UNISEX').length;
  console.log(`MALE: ${maleCount}`);
  console.log(`FEMALE: ${femaleCount}`);
  console.log(`UNISEX: ${unisexCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
