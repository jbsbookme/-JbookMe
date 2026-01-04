import { prisma } from './lib/db';

async function testGeneralMaleService() {
  console.log('================================');
  console.log('PRUEBA: Sistema de servicios GENERAL');
  console.log('================================\n');

  // 1. Verificar barberos MALE
  console.log('1. Barberos MALE en base de datos:');
  const maleBarbers = await prisma.barber.findMany({
    where: { gender: 'MALE' },
    include: { user: { select: { name: true } } }
  });
  
  maleBarbers.forEach(b => {
    console.log(`   - ${b.user.name} (ID: ${b.id})`);
  });

  // 2. Verificar barberos FEMALE
  console.log('\n2. Estilistas FEMALE en base de datos:');
  const femaleBarbers = await prisma.barber.findMany({
    where: { gender: 'FEMALE' },
    include: { user: { select: { name: true } } }
  });
  
  femaleBarbers.forEach(b => {
    console.log(`   - ${b.user.name} (ID: ${b.id})`);
  });

  // 3. Crear servicio MALE "general" manualmente
  console.log('\n3. Creando servicio MALE para todos los barberos MALE...');
  
  const testServices = [];
  for (const barber of maleBarbers) {
    const service = await prisma.service.create({
      data: {
        name: 'Corte Test MALE',
        duration: 30,
        price: 35.00,
        gender: 'MALE',
        barberId: barber.id,
        isActive: true
      }
    });
    testServices.push(service);
    console.log(`   ✓ Servicio creado para ${barber.user.name}`);
  }

  // 4. Verificar que NO se creó para FEMALE
  console.log('\n4. Verificando servicios por barbero:');
  
  for (const barber of [...maleBarbers, ...femaleBarbers]) {
    const count = await prisma.service.count({
      where: {
        barberId: barber.id,
        name: 'Corte Test MALE'
      }
    });
    const symbol = count > 0 ? '✓' : '✗';
    console.log(`   ${symbol} ${barber.user.name} (${barber.gender}): ${count} servicio(s)`);
  }

  // 5. Limpiar servicios de prueba
  console.log('\n5. Limpiando servicios de prueba...');
  await prisma.service.deleteMany({
    where: { name: 'Corte Test MALE' }
  });
  console.log('   ✓ Limpieza completada');

  console.log('\n================================');
  console.log('✅ PRUEBA COMPLETADA');
  console.log('================================');
}

testGeneralMaleService()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
