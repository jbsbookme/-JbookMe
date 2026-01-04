import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[STEP 1] Desactivando todos los servicios existentes...');
  await prisma.service.updateMany({
    where: {},
    data: { isActive: false }
  });
  console.log('[OK] Todos los servicios desactivados\n');
  
  console.log('[STEP 2] Creando servicios generales MALE...');
  const maleServices = [
    { name: 'Haircut', description: 'Corte de cabello clasico', duration: 45, price: 35 },
    { name: 'Haircut & Beard', description: 'Corte + arreglo de barba', duration: 60, price: 45 },
    { name: 'Kids Haircut', description: 'Corte para ninos', duration: 30, price: 25 },
    { name: 'Beard Trim', description: 'Arreglo de barba', duration: 20, price: 20 },
    { name: 'Hot Towel Shave', description: 'Afeitado con toalla caliente', duration: 30, price: 30 },
    { name: 'Lineup', description: 'Lineas y contornos', duration: 20, price: 35 },
    { name: 'Haircut with Designs', description: 'Corte con disenos', duration: 60, price: 45 },
    { name: 'Facial Treatment', description: 'Tratamiento facial', duration: 45, price: 45 },
  ];
  
  for (const service of maleServices) {
    await prisma.service.create({
      data: {
        ...service,
        gender: 'MALE',
        barberId: null,
        isActive: true
      }
    });
  }
  console.log(`[OK] ${maleServices.length} servicios MALE creados\n`);
  
  console.log('[STEP 3] Creando servicios generales FEMALE...');
  const femaleServices = [
    { name: "Women's Haircut", description: 'Corte femenino', duration: 60, price: 45 },
    { name: 'Blowout', description: 'Secado y peinado', duration: 45, price: 40 },
    { name: 'Hair Styling', description: 'Peinado profesional', duration: 60, price: 50 },
    { name: 'Updo', description: 'Recogido elegante', duration: 75, price: 65 },
    { name: 'Balayage', description: 'Tecnica de coloracion', duration: 180, price: 120 },
    { name: 'Color Treatment', description: 'Tratamiento de color', duration: 120, price: 80 },
    { name: 'Highlights', description: 'Mechas', duration: 150, price: 100 },
    { name: 'Keratin Treatment', description: 'Tratamiento de keratina', duration: 180, price: 150 },
    { name: "Women's Cut & Color", description: 'Corte + color', duration: 150, price: 120 },
    { name: 'Hair Extensions', description: 'Extensiones', duration: 180, price: 200 },
  ];
  
  for (const service of femaleServices) {
    await prisma.service.create({
      data: {
        ...service,
        gender: 'FEMALE',
        barberId: null,
        isActive: true
      }
    });
  }
  console.log(`[OK] ${femaleServices.length} servicios FEMALE creados\n`);
  
  console.log('[STEP 4] Creando servicios UNISEX...');
  const unisexServices = [
    { name: 'Hair Color', description: 'Coloracion de cabello', duration: 90, price: 70 },
    { name: 'Deep Conditioning', description: 'Tratamiento profundo', duration: 45, price: 35 },
  ];
  
  for (const service of unisexServices) {
    await prisma.service.create({
      data: {
        ...service,
        gender: 'UNISEX',
        barberId: null,
        isActive: true
      }
    });
  }
  console.log(`[OK] ${unisexServices.length} servicios UNISEX creados\n`);
  
  const finalCount = await prisma.service.count({ where: { isActive: true } });
  console.log('\n=== RESET COMPLETADO! ===');
  console.log(`Total servicios activos: ${finalCount}`);
  console.log('\nCada barbero/estilista puede agregar servicios propios desde su panel.\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
