import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'jbsbookme@gmail.com';

// Lista de usuarios de prueba que NO se deben eliminar
const TEST_USERS = [
  // Admins de prueba
  OWNER_EMAIL,
  'admin@barberia.com',
  'john@doe.com',
  
  // Barberos de prueba
  'miguel.santos@barberia.com',
  'jose.rodriguez@barberia.com',
  'celeste.paulino@barberia.com',
  'sandra.paez@barberia.com',
  'david.fernandez@barberia.com',
  'alejandro.ruiz@barberia.com',
  
  // Clientes de prueba
  'maria.garcia@example.com',
  'carlos.lopez@example.com',
  'ana.martinez@example.com'
];

async function deleteRealUsersOnly() {
  console.log('🔍 Iniciando limpieza de usuarios reales...');
  console.log('✅ Los siguientes usuarios de prueba NO serán eliminados:');
  TEST_USERS.forEach(email => console.log(`   - ${email}`));
  console.log('');

  try {
    // 1. Obtener todos los usuarios que NO son de prueba
    const realUsers = await prisma.user.findMany({
      where: {
        email: {
          notIn: TEST_USERS
        }
      },
      include: {
        barber: true,
        accounts: true,
        sessions: true
      }
    });

    console.log(`📊 Usuarios reales encontrados: ${realUsers.length}`);
    
    if (realUsers.length === 0) {
      console.log('✨ No hay usuarios reales para eliminar. Sistema limpio.');
      return;
    }

    // Mostrar lista de usuarios a eliminar
    console.log('\n🗑️  Usuarios que serán eliminados:');
    realUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.role}) - ID: ${user.id}`);
    });
    console.log('');

    const realUserIds = realUsers.map(u => u.id);
    const realBarberIds = realUsers
      .filter(u => u.barber)
      .map(u => u.barber!.id);

    let deletedCounts = {
      appointments: 0,
      reviews: 0,
      posts: 0,
      postLikes: 0,
      comments: 0,
      messages: 0,
      media: 0,
      availability: 0,
      daysOff: 0,
      barberPayments: 0,
      manualPayments: 0,
      invoices: 0,
      notifications: 0,
      pushSubscriptions: 0,
      accounts: 0,
      sessions: 0,
      barbers: 0,
      users: 0
    };

    // 2. Eliminar citas donde el cliente es usuario real
    const deletedAppointments = await prisma.appointment.deleteMany({
      where: {
        OR: [
          { clientId: { in: realUserIds } },
          { barberId: { in: realBarberIds } }
        ]
      }
    });
    deletedCounts.appointments = deletedAppointments.count;
    console.log(`✅ Citas eliminadas: ${deletedCounts.appointments}`);

    // 3. Eliminar reseñas de usuarios reales
    const deletedReviews = await prisma.review.deleteMany({
      where: {
        OR: [
          { clientId: { in: realUserIds } },
          { barberId: { in: realBarberIds } }
        ]
      }
    });
    deletedCounts.reviews = deletedReviews.count;
    console.log(`✅ Reseñas eliminadas: ${deletedCounts.reviews}`);

    // 4. Eliminar posts de barberos reales
    const deletedPosts = await prisma.post.deleteMany({
      where: {
        barberId: { in: realBarberIds }
      }
    });
    deletedCounts.posts = deletedPosts.count;
    console.log(`✅ Posts eliminados: ${deletedCounts.posts}`);

    // 4b. Eliminar likes de posts de usuarios reales
    const deletedPostLikes = await prisma.postLike.deleteMany({
      where: {
        userId: { in: realUserIds }
      }
    });
    deletedCounts.postLikes = deletedPostLikes.count;
    console.log(`✅ Likes de posts eliminados: ${deletedCounts.postLikes}`);

    // 5. Eliminar comentarios de usuarios reales
    const deletedComments = await prisma.comment.deleteMany({
      where: {
        authorId: { in: realUserIds }
      }
    });
    deletedCounts.comments = deletedComments.count;
    console.log(`✅ Comentarios eliminados: ${deletedCounts.comments}`);

    // 6. Eliminar mensajes de usuarios reales
    const deletedMessages = await prisma.message.deleteMany({
      where: {
        OR: [
          { senderId: { in: realUserIds } },
          { recipientId: { in: realUserIds } }
        ]
      }
    });
    deletedCounts.messages = deletedMessages.count;
    console.log(`✅ Mensajes eliminados: ${deletedCounts.messages}`);

    // 7. Eliminar media de barberos reales
    const deletedMedia = await prisma.barberMedia.deleteMany({
      where: {
        barberId: { in: realBarberIds }
      }
    });
    deletedCounts.media = deletedMedia.count;
    console.log(`✅ Media eliminados: ${deletedCounts.media}`);

    // 8. Eliminar disponibilidad de barberos reales
    const deletedAvailability = await prisma.availability.deleteMany({
      where: {
        barberId: { in: realBarberIds }
      }
    });
    deletedCounts.availability = deletedAvailability.count;
    console.log(`✅ Horarios de disponibilidad eliminados: ${deletedCounts.availability}`);

    // 8b. Eliminar días libres de barberos reales
    const deletedDaysOff = await prisma.dayOff.deleteMany({
      where: {
        barberId: { in: realBarberIds }
      }
    });
    deletedCounts.daysOff = deletedDaysOff.count;
    console.log(`✅ Días libres eliminados: ${deletedCounts.daysOff}`);

    // 9. Eliminar pagos de barberos reales
    const deletedBarberPayments = await prisma.barberPayment.deleteMany({
      where: {
        barberId: { in: realBarberIds }
      }
    });
    deletedCounts.barberPayments = deletedBarberPayments.count;
    console.log(`✅ Pagos de barberos eliminados: ${deletedCounts.barberPayments}`);

    // 10. Eliminar pagos manuales de barberos reales
    const deletedManualPayments = await prisma.manualPayment.deleteMany({
      where: {
        barberId: { in: realBarberIds }
      }
    });
    deletedCounts.manualPayments = deletedManualPayments.count;
    console.log(`✅ Pagos manuales eliminados: ${deletedCounts.manualPayments}`);

    // 11. Eliminar facturas de usuarios reales
    const deletedInvoices = await prisma.invoice.deleteMany({
      where: {
        recipientId: { in: realUserIds }
      }
    });
    deletedCounts.invoices = deletedInvoices.count;
    console.log(`✅ Facturas eliminadas: ${deletedCounts.invoices}`);

    // 11b. Eliminar notificaciones de usuarios reales
    const deletedNotifications = await prisma.notification.deleteMany({
      where: {
        userId: { in: realUserIds }
      }
    });
    deletedCounts.notifications = deletedNotifications.count;
    console.log(`✅ Notificaciones eliminadas: ${deletedCounts.notifications}`);

    // 11c. Eliminar suscripciones push de usuarios reales
    const deletedPushSubscriptions = await prisma.pushSubscription.deleteMany({
      where: {
        userId: { in: realUserIds }
      }
    });
    deletedCounts.pushSubscriptions = deletedPushSubscriptions.count;
    console.log(`✅ Suscripciones push eliminadas: ${deletedCounts.pushSubscriptions}`);

    // 12. Eliminar cuentas OAuth de usuarios reales
    const deletedAccounts = await prisma.account.deleteMany({
      where: {
        userId: { in: realUserIds }
      }
    });
    deletedCounts.accounts = deletedAccounts.count;
    console.log(`✅ Cuentas OAuth eliminadas: ${deletedCounts.accounts}`);

    // 13. Eliminar sesiones de usuarios reales
    const deletedSessions = await prisma.session.deleteMany({
      where: {
        userId: { in: realUserIds }
      }
    });
    deletedCounts.sessions = deletedSessions.count;
    console.log(`✅ Sesiones eliminadas: ${deletedCounts.sessions}`);

    // 14. Eliminar registros de barberos reales
    const deletedBarbers = await prisma.barber.deleteMany({
      where: {
        id: { in: realBarberIds }
      }
    });
    deletedCounts.barbers = deletedBarbers.count;
    console.log(`✅ Registros de barberos eliminados: ${deletedCounts.barbers}`);

    // 15. Finalmente, eliminar usuarios reales
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        id: { in: realUserIds }
      }
    });
    deletedCounts.users = deletedUsers.count;
    console.log(`✅ Usuarios eliminados: ${deletedCounts.users}`);

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE ELIMINACIÓN:');
    console.log('='.repeat(60));
    console.log(`Citas:                    ${deletedCounts.appointments}`);
    console.log(`Reseñas:                  ${deletedCounts.reviews}`);
    console.log(`Posts:                    ${deletedCounts.posts}`);
    console.log(`Likes de posts:           ${deletedCounts.postLikes}`);
    console.log(`Comentarios:              ${deletedCounts.comments}`);
    console.log(`Mensajes:                 ${deletedCounts.messages}`);
    console.log(`Media:                    ${deletedCounts.media}`);
    console.log(`Horarios disponibilidad:  ${deletedCounts.availability}`);
    console.log(`Días libres:              ${deletedCounts.daysOff}`);
    console.log(`Pagos de barberos:        ${deletedCounts.barberPayments}`);
    console.log(`Pagos manuales:           ${deletedCounts.manualPayments}`);
    console.log(`Facturas:                 ${deletedCounts.invoices}`);
    console.log(`Notificaciones:           ${deletedCounts.notifications}`);
    console.log(`Suscripciones push:       ${deletedCounts.pushSubscriptions}`);
    console.log(`Cuentas OAuth:            ${deletedCounts.accounts}`);
    console.log(`Sesiones:                 ${deletedCounts.sessions}`);
    console.log(`Barberos:                 ${deletedCounts.barbers}`);
    console.log(`Usuarios:                 ${deletedCounts.users}`);
    console.log('='.repeat(60));

    // Verificar usuarios restantes
    const remainingUsers = await prisma.user.findMany({
      select: {
        email: true,
        role: true
      },
      orderBy: {
        role: 'asc'
      }
    });

    console.log('\n✅ USUARIOS DE PRUEBA CONSERVADOS:');
    console.log('='.repeat(60));
    remainingUsers.forEach(user => {
      console.log(`   ${user.role.padEnd(10)} - ${user.email}`);
    });
    console.log('='.repeat(60));
    console.log(`\n✨ Limpieza completada exitosamente!`);
    console.log(`✅ Total de usuarios reales eliminados: ${deletedCounts.users}`);
    console.log(`✅ Total de usuarios de prueba conservados: ${remainingUsers.length}`);

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteRealUsersOnly()
  .then(() => {
    console.log('\n🎉 Proceso completado con éxito!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
