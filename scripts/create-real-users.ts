import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createRealUsers() {
  console.log('🚀 Creando usuarios reales...');

  try {
    // Lista de usuarios a crear
    const users = [
      {
        name: 'Adolfo Torres',
        email: 'Adolfobookme@gmail.com',
        password: 'Adolfo9801',
        role: 'BARBER' as const,
        isBarber: true,
      },
      {
        name: 'Jean Carlos Guzman',
        email: 'Jeanbookme@gmail.com',
        password: 'Jeancarlos9802',
        role: 'BARBER' as const,
        isBarber: true,
      },
      {
        name: 'Martin Sanchez',
        email: 'Martinbookme@gmail.com',
        password: 'Martin9804',
        role: 'BARBER' as const,
        isBarber: true,
      },
      {
        name: 'Sandra Paez',
        email: 'sandrabookme@gmail.com',
        password: 'Sandra9805',
        role: 'BARBER' as const,
        isBarber: true,
      },
      {
        name: 'Celeste Paulino',
        email: 'celestebookme@gmail.com',
        password: 'Celeste9806',
        role: 'BARBER' as const,
        isBarber: true,
      },
      {
        name: 'Jorge Benites',
        email: 'Jbsbookme@gmail.com',
        password: 'Jb9800',
        role: 'ADMIN' as const,
        isBarber: false,
      },
    ];

    for (const userData of users) {
      console.log(`\n📧 Procesando: ${userData.name} (${userData.email})`);

      // Verificar si el usuario ya existe
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        console.log(`   ⚠️  Usuario ya existe, actualizando contraseña...`);
        
        // Hashear la nueva contraseña
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        // Actualizar el usuario
        await prisma.user.update({
          where: { email: userData.email },
          data: {
            name: userData.name,
            password: hashedPassword,
            role: userData.role,
          },
        });

        console.log(`   ✅ Usuario actualizado exitosamente`);

        // Si es barbero, verificar/crear registro de barbero
        if (userData.isBarber) {
          const existingBarber = await prisma.barber.findUnique({
            where: { userId: existingUser.id },
          });

          if (!existingBarber) {
            await prisma.barber.create({
              data: {
                userId: existingUser.id,
                bio: `Profesional especializado en estilos modernos y clásicos.`,
                specialties: 'Cortes, Barbería, Diseño',
                rating: 4.8,
                availability: {
                  create: [
                    { dayOfWeek: 'MONDAY', startTime: '09:00 AM', endTime: '06:00 PM', isAvailable: true },
                    { dayOfWeek: 'TUESDAY', startTime: '09:00 AM', endTime: '06:00 PM', isAvailable: true },
                    { dayOfWeek: 'WEDNESDAY', startTime: '09:00 AM', endTime: '06:00 PM', isAvailable: true },
                    { dayOfWeek: 'THURSDAY', startTime: '09:00 AM', endTime: '06:00 PM', isAvailable: true },
                    { dayOfWeek: 'FRIDAY', startTime: '09:00 AM', endTime: '06:00 PM', isAvailable: true },
                    { dayOfWeek: 'SATURDAY', startTime: '10:00 AM', endTime: '08:00 PM', isAvailable: true },
                    { dayOfWeek: 'SUNDAY', startTime: '10:00 AM', endTime: '06:00 PM', isAvailable: false },
                  ],
                },
              },
            });
            console.log(`   ✅ Perfil de barbero creado`);
          } else {
            console.log(`   ℹ️  Perfil de barbero ya existe`);
          }
        }
        continue;
      }

      // Hashear la contraseña
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Crear el usuario
      const user = await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          role: userData.role,
        },
      });

      console.log(`   ✅ Usuario creado con ID: ${user.id}`);

      // Si es barbero, crear el perfil de barbero
      if (userData.isBarber) {
        const barber = await prisma.barber.create({
          data: {
            userId: user.id,
            bio: `Profesional especializado en estilos modernos y clásicos.`,
            specialties: 'Cortes, Barbería, Diseño',
            rating: 4.8,
            availability: {
              create: [
                { dayOfWeek: 'MONDAY', startTime: '09:00 AM', endTime: '06:00 PM', isAvailable: true },
                { dayOfWeek: 'TUESDAY', startTime: '09:00 AM', endTime: '06:00 PM', isAvailable: true },
                { dayOfWeek: 'WEDNESDAY', startTime: '09:00 AM', endTime: '06:00 PM', isAvailable: true },
                { dayOfWeek: 'THURSDAY', startTime: '09:00 AM', endTime: '06:00 PM', isAvailable: true },
                { dayOfWeek: 'FRIDAY', startTime: '09:00 AM', endTime: '06:00 PM', isAvailable: true },
                { dayOfWeek: 'SATURDAY', startTime: '10:00 AM', endTime: '08:00 PM', isAvailable: true },
                { dayOfWeek: 'SUNDAY', startTime: '10:00 AM', endTime: '06:00 PM', isAvailable: false },
              ],
            },
          },
        });
        console.log(`   ✅ Perfil de barbero creado con ID: ${barber.id}`);
      }
    }

    console.log('\n🎉 ¡Todos los usuarios fueron creados exitosamente!');
    console.log('\n📋 CREDENCIALES CREADAS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log(`   Rol: ${user.role}`);
    });
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🔒 Las contraseñas están hasheadas en la base de datos.');
    console.log('✅ Puedes iniciar sesión con estos emails y contraseñas.');

  } catch (error) {
    console.error('❌ Error creando usuarios:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createRealUsers();
