import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Limpiando TODOS los servicios...\n');

  // Eliminar TODOS los servicios
  const deleted = await prisma.service.deleteMany({});
  
  console.log(`✅ Eliminados ${deleted.count} servicios\n`);
  console.log('🎯 Ahora cada barbero debe crear sus propios servicios en:');
  console.log('   /dashboard/barbero/servicios\n');
  console.log('📋 Credenciales de barberos:');
  console.log('   - José: jose.rodriguez@barberia.com / barber123');
  console.log('   - Miguel: miguel.santos@barberia.com / barber123');
  console.log('   - Celeste: celeste.paulino@barberia.com / barber123');
  console.log('   - Sandra: sandra.paez@barberia.com / barber123\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
