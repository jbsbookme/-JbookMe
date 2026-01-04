import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("\n[LIMPIEZA] Iniciando limpieza de base de datos\n");
  console.log("=".repeat(50));

  const allBarbers = await prisma.barber.findMany({
    include: { user: true }
  });

  console.log(`\nTotal barberos encontrados: ${allBarbers.length}\n`);

  const keepEmails = [
    'miguel.santos@barberia.com',
    'sofia.fernandez@barberia.com',
    'jose.rodriguez@barberia.com',
    'isabella.ruiz@barberia.com'
  ];

  const barbersToKeep = allBarbers.filter(b => keepEmails.includes(b.user.email));
  const barbersToDelete = allBarbers.filter(b => !keepEmails.includes(b.user.email));

  console.log(`[MANTENER] ${barbersToKeep.length} barberos:`);
  barbersToKeep.forEach(b => console.log(`   - ${b.user.name} (${b.user.email})`));

  console.log(`\n[ELIMINAR] ${barbersToDelete.length} barberos:`);
  barbersToDelete.forEach(b => console.log(`   - ${b.user.name} (${b.user.email})`));

  for (const barber of barbersToDelete) {
    console.log(`\n[PROCESANDO] ${barber.user.name}...`);
    
    const barberId = barber.id;
    const userIdToDelete = barber.userId;

    try {
      await prisma.appointment.updateMany({
        where: {
          barberId,
          status: { in: ['PENDING', 'CONFIRMED'] }
        },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: 'Limpieza de base de datos',
        }
      });

      await prisma.availability.deleteMany({ where: { barberId } });
      await prisma.dayOff.deleteMany({ where: { barberId } });
      await prisma.barberMedia.deleteMany({ where: { barberId } });
      await prisma.barberPayment.deleteMany({ where: { barberId } });
      await prisma.manualPayment.deleteMany({ where: { barberId } });
      await prisma.appointment.deleteMany({ where: { barberId } });
      await prisma.review.deleteMany({ where: { barberId } });
      await prisma.post.deleteMany({ where: { barberId } });

      await prisma.barber.delete({ where: { id: barberId } });

      await prisma.account.deleteMany({ where: { userId: userIdToDelete } });
      await prisma.session.deleteMany({ where: { userId: userIdToDelete } });
      await prisma.appointment.deleteMany({ where: { clientId: userIdToDelete } });
      await prisma.review.deleteMany({ where: { clientId: userIdToDelete } });
      await prisma.invoice.deleteMany({ where: { recipientId: userIdToDelete } });
      await prisma.post.deleteMany({ where: { authorId: userIdToDelete } });
      await prisma.comment.deleteMany({ where: { authorId: userIdToDelete } });
      await prisma.message.deleteMany({
        where: {
          OR: [
            { senderId: userIdToDelete },
            { recipientId: userIdToDelete }
          ]
        }
      });
      await prisma.notification.deleteMany({ where: { userId: userIdToDelete } });
      await prisma.pushSubscription.deleteMany({ where: { userId: userIdToDelete } });

      await prisma.user.delete({ where: { id: userIdToDelete } });

      console.log(`[OK] ${barber.user.name} eliminado`);

    } catch (error) {
      console.error(`[ERROR] Fallo al eliminar ${barber.user.name}:`, error);
      throw error;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("[COMPLETADO] Limpieza finalizada\n");

  const finalBarbers = await prisma.barber.findMany({
    include: { user: true }
  });

  console.log(`Barberos restantes: ${finalBarbers.length}\n`);
  finalBarbers.forEach(b => console.log(`   - ${b.user.name} (${b.user.email})`));

  console.log("\n[LISTO] Base de datos limpia\n");
}

main()
  .catch((e) => {
    console.error('\n[ERROR FATAL]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
