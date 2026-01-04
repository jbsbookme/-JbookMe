import { PrismaClient, Role, AppointmentStatus, PaymentMethod, DayOfWeek, PaymentStatus, ExpenseCategory, Gender } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await prisma.expense.deleteMany();
  await prisma.barberPayment.deleteMany();
  await prisma.review.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.service.deleteMany();
  await prisma.barber.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.settings.deleteMany();

  console.log('✅ Cleared existing data');

  // Hash passwords
  const hashedAdminPassword = await bcrypt.hash('johndoe123', 10);
  const hashedNewAdminPassword = await bcrypt.hash('Admin2024!', 10);
  const hashedClientPassword = await bcrypt.hash('client123', 10);
  const hashedBarberPassword = await bcrypt.hash('barber123', 10);

  // Create Admin Users
  const admin = await prisma.user.create({
    data: {
      email: 'john@doe.com',
      password: hashedAdminPassword,
      name: 'Admin User',
      role: Role.ADMIN,
      phone: '+1234567890',
      image: 'https://i.pravatar.cc/150?img=33',
    },
  });

  const admin2 = await prisma.user.create({
    data: {
      email: 'admin@barberia.com',
      password: hashedNewAdminPassword,
      name: 'Administrador Principal',
      role: Role.ADMIN,
      phone: '+1234567899',
      image: 'https://i.pravatar.cc/150?img=60',
    },
  });

  console.log('✅ Created admin users');

  // Create Client Users
  const client1 = await prisma.user.create({
    data: {
      email: 'maria.garcia@example.com',
      password: hashedClientPassword,
      name: 'María García',
      role: Role.CLIENT,
      phone: '+1234567891',
      image: 'https://i.pravatar.cc/150?img=47',
    },
  });

  const client2 = await prisma.user.create({
    data: {
      email: 'carlos.lopez@example.com',
      password: hashedClientPassword,
      name: 'Carlos López',
      role: Role.CLIENT,
      phone: '+1234567892',
      image: 'https://i.pravatar.cc/150?img=12',
    },
  });

  const client3 = await prisma.user.create({
    data: {
      email: 'ana.martinez@example.com',
      password: hashedClientPassword,
      name: 'Ana Martínez',
      role: Role.CLIENT,
      phone: '+1234567893',
      image: 'https://i.pravatar.cc/150?img=20',
    },
  });

  console.log('✅ Created client users');

  // Create Barber Users
  const barberUser1 = await prisma.user.create({
    data: {
      email: 'miguel.santos@barberia.com',
      password: hashedBarberPassword,
      name: 'Miguel Santos',
      role: Role.BARBER,
      phone: '+1234567894',
      image: 'https://i.pravatar.cc/150?img=15',
    },
  });

  const barberUser2 = await prisma.user.create({
    data: {
      email: 'sofia.fernandez@barberia.com',
      password: hashedBarberPassword,
      name: 'Sofia Fernández',
      role: Role.BARBER,
      phone: '+1234567895',
      image: 'https://i.pravatar.cc/150?img=47',
    },
  });

  const barberUser3 = await prisma.user.create({
    data: {
      email: 'jose.rodriguez@barberia.com',
      password: hashedBarberPassword,
      name: 'José Rodríguez',
      role: Role.BARBER,
      phone: '+1234567896',
      image: 'https://i.pravatar.cc/150?img=52',
    },
  });

  const barberUser4 = await prisma.user.create({
    data: {
      email: 'isabella.ruiz@barberia.com',
      password: hashedBarberPassword,
      name: 'Isabella Ruiz',
      role: Role.BARBER,
      phone: '+1234567897',
      image: 'https://i.pravatar.cc/150?img=20',
    },
  });

  console.log('✅ Created barber users');

  // Create Barber Profiles
  const barber1 = await prisma.barber.create({
    data: {
      userId: barberUser1.id,
      bio: 'Especialista en cortes clásicos y modernos. Con más de 10 años de experiencia, mi pasión es crear estilos únicos que resalten la personalidad de cada cliente. Me dedico a brindar un servicio personalizado donde cada detalle cuenta.',
      specialties: 'Fade, Pompadour, Cortes clásicos',
      hourlyRate: 25,
      isActive: true,
      profileImage: 'https://i.pravatar.cc/300?img=15',
      phone: '+1 (555) 123-4567',
      facebookUrl: 'https://facebook.com/miguel.santos.barber',
      instagramUrl: 'https://instagram.com/miguel_santos_cuts',
      twitterUrl: 'https://twitter.com/miguel_barber',
      rating: 4.9,
      zelleEmail: 'miguel.santos@zelle.com',
      zellePhone: '+15551234567',
      cashappTag: '$MiguelSantos',
      contactEmail: 'miguel.santos@jbbarbershop.com',
      gender: Gender.MALE, // Atiende hombres
    },
  });

  const barber2 = await prisma.barber.create({
    data: {
      userId: barberUser2.id,
      bio: 'Estilista especializada en cortes y peinados para mujeres. Combino técnicas clásicas con tendencias modernas para un look impecable. Cada servicio es una experiencia de relajación y estilo.',
      specialties: 'Cortes femeninos, Peinados, Tratamientos capilares',
      hourlyRate: 30,
      isActive: true,
      profileImage: 'https://i.pravatar.cc/300?img=47',
      phone: '+1 (555) 234-5678',
      facebookUrl: 'https://facebook.com/sofia.fernandez.stylist',
      instagramUrl: 'https://instagram.com/sofia_stylist_pro',
      twitterUrl: null,
      rating: 4.8,
      zelleEmail: 'sofia.fernandez@zelle.com',
      zellePhone: '+15552345678',
      cashappTag: '$SofiaFernandez',
      contactEmail: 'sofia.fernandez@jbbarbershop.com',
      gender: Gender.FEMALE, // Atiende mujeres
    },
  });

  const barber3 = await prisma.barber.create({
    data: {
      userId: barberUser3.id,
      bio: 'Barbero de nueva generación especializado en estilos urbanos y creativos. Cada corte es una obra de arte personalizada. Me apasiona estar a la vanguardia de las últimas tendencias.',
      specialties: 'Cortes creativos, Hair tattoo, Estilos urbanos',
      hourlyRate: 28,
      isActive: true,
      profileImage: 'https://i.pravatar.cc/300?img=52',
      phone: '+1 (555) 345-6789',
      facebookUrl: null,
      instagramUrl: 'https://instagram.com/jose_creative_cuts',
      twitterUrl: 'https://twitter.com/jose_barber',
      rating: 4.7,
      zelleEmail: 'jose.rodriguez@zelle.com',
      zellePhone: '+15553456789',
      cashappTag: '$JoseRodriguez',
      contactEmail: 'jose.rodriguez@jbbarbershop.com',
      gender: Gender.MALE, // Atiende hombres
    },
  });

  const barber4 = await prisma.barber.create({
    data: {
      userId: barberUser4.id,
      bio: 'Estilista veterana con enfoque en cortes y tratamientos para mujeres. Cada servicio es una experiencia premium. Más de 15 años perfeccionando mi técnica para ofrecer resultados excepcionales.',
      specialties: 'Cortes premium, Tratamientos capilares, Consultoría de estilo',
      hourlyRate: 35,
      isActive: true,
      profileImage: 'https://i.pravatar.cc/300?img=20',
      phone: '+1 (555) 456-7890',
      facebookUrl: 'https://facebook.com/isabella.ruiz.stylist',
      instagramUrl: 'https://instagram.com/isabella_luxury_style',
      twitterUrl: 'https://twitter.com/isabella_stylist',
      rating: 5.0,
      zelleEmail: 'isabella.ruiz@zelle.com',
      zellePhone: '+15554567890',
      cashappTag: '$IsabellaRuiz',
      contactEmail: 'isabella.ruiz@jbbarbershop.com',
      gender: Gender.FEMALE, // Atiende mujeres
    },
  });

  console.log('✅ Created barber profiles');

  // Create Services
  const services = [
    // Barber 1 Services (Hombres)
    {
      name: 'Corte Clásico',
      description: 'Corte tradicional con tijera y navaja, incluye lavado y secado',
      duration: 30,
      price: 25,
      barberId: barber1.id,
      gender: Gender.MALE,
    },
    {
      name: 'Fade Premium',
      description: 'Degradado perfecto con transiciones suaves y definidas',
      duration: 45,
      price: 35,
      barberId: barber1.id,
      gender: Gender.MALE,
    },
    {
      name: 'Pompadour Moderno',
      description: 'Estilo clásico actualizado con técnicas contemporáneas',
      duration: 60,
      price: 45,
      barberId: barber1.id,
      gender: Gender.MALE,
    },
    // Barber 2 Services (Mujeres)
    {
      name: 'Corte Femenino Clásico',
      description: 'Corte tradicional con técnicas especializadas para cabello femenino',
      duration: 40,
      price: 35,
      barberId: barber2.id,
      gender: Gender.FEMALE,
    },
    {
      name: 'Peinado Profesional',
      description: 'Peinado elegante para eventos y ocasiones especiales',
      duration: 60,
      price: 50,
      barberId: barber2.id,
      gender: Gender.FEMALE,
    },
    {
      name: 'Corte + Tratamiento',
      description: 'Servicio completo: corte y tratamiento hidratante',
      duration: 90,
      price: 70,
      barberId: barber2.id,
      gender: Gender.FEMALE,
    },
    // Barber 3 Services (Hombres)
    {
      name: 'Corte Urbano',
      description: 'Estilos modernos y creativos con acabados únicos',
      duration: 45,
      price: 38,
      barberId: barber3.id,
      gender: Gender.MALE,
    },
    {
      name: 'Hair Tattoo',
      description: 'Diseños artísticos tallados en el cabello',
      duration: 60,
      price: 50,
      barberId: barber3.id,
      gender: Gender.MALE,
    },
    {
      name: 'Corte Creativo',
      description: 'Estilo personalizado con técnicas innovadoras',
      duration: 90,
      price: 65,
      barberId: barber3.id,
      gender: Gender.MALE,
    },
    // Barber 4 Services (Mujeres)
    {
      name: 'Corte Premium Femenino',
      description: 'Corte profesional y elegante con técnicas avanzadas',
      duration: 50,
      price: 45,
      barberId: barber4.id,
      gender: Gender.FEMALE,
    },
    {
      name: 'Tratamiento Capilar Premium',
      description: 'Tratamiento profesional con productos de alta gama',
      duration: 75,
      price: 80,
      barberId: barber4.id,
      gender: Gender.FEMALE,
    },
    {
      name: 'Consultoría + Corte VIP',
      description: 'Servicio completo con asesoría personalizada de estilo',
      duration: 120,
      price: 95,
      barberId: barber4.id,
      gender: Gender.FEMALE,
    },
  ];

  for (const service of services) {
    await prisma.service.create({ data: service });
  }

  console.log('✅ Created services');

  // Get all services for appointments
  const allServices = await prisma.service.findMany();

  // Create Availability for all barbers (Monday to Saturday)
  const days: DayOfWeek[] = [
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
  ];

  const barbers = [barber1, barber2, barber3, barber4];

  for (const barber of barbers) {
    for (const day of days) {
      await prisma.availability.create({
        data: {
          barberId: barber.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '18:00',
          isAvailable: true,
        },
      });
    }
  }

  console.log('✅ Created availability schedules');

  // Create Appointments
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const appointment1 = await prisma.appointment.create({
    data: {
      clientId: client1.id,
      barberId: barber1.id,
      serviceId: allServices[0].id,
      date: tomorrow,
      time: '10:00',
      status: AppointmentStatus.CONFIRMED,
      paymentMethod: PaymentMethod.CASH,
      notes: 'Prefiero el corte un poco más corto en los lados',
    },
  });

  const appointment2 = await prisma.appointment.create({
    data: {
      clientId: client2.id,
      barberId: barber2.id,
      serviceId: allServices[3].id,
      date: nextWeek,
      time: '14:30',
      status: AppointmentStatus.PENDING,
      paymentMethod: PaymentMethod.CREDIT_CARD,
    },
  });

  const appointment3 = await prisma.appointment.create({
    data: {
      clientId: client3.id,
      barberId: barber3.id,
      serviceId: allServices[6].id,
      date: lastWeek,
      time: '11:00',
      status: AppointmentStatus.COMPLETED,
      paymentMethod: PaymentMethod.ZELLE,
    },
  });

  const appointment4 = await prisma.appointment.create({
    data: {
      clientId: client1.id,
      barberId: barber4.id,
      serviceId: allServices[9].id,
      date: lastWeek,
      time: '16:00',
      status: AppointmentStatus.COMPLETED,
      paymentMethod: PaymentMethod.PAYPAL,
    },
  });

  const appointment5 = await prisma.appointment.create({
    data: {
      clientId: client2.id,
      barberId: barber1.id,
      serviceId: allServices[1].id,
      date: tomorrow,
      time: '15:00',
      status: AppointmentStatus.CONFIRMED,
      paymentMethod: PaymentMethod.CASH,
    },
  });

  console.log('✅ Created appointments');

  // Create Reviews (only for completed appointments)
  await prisma.review.create({
    data: {
      appointmentId: appointment3.id,
      clientId: client3.id,
      barberId: barber3.id,
      rating: 5,
      comment: '¡Excelente servicio! El corte quedó perfecto y el ambiente es muy profesional. Totalmente recomendado.',
    },
  });

  await prisma.review.create({
    data: {
      appointmentId: appointment4.id,
      clientId: client1.id,
      barberId: barber4.id,
      rating: 5,
      comment: 'Alejandro es un artista. El corte ejecutivo quedó impecable y la atención fue de primera. Definitivamente volveré.',
    },
  });

  console.log('✅ Created reviews');

  // Create Settings
  await prisma.settings.create({
    data: {
      shopName: 'BookMe',
      address: 'Calle Principal 123, Ciudad',
      phone: '+1234567890',
      email: 'contacto@bookme.com',
    },
  });

  console.log('✅ Created shop settings');

  // Create Barber Payments
  const now = new Date();
  
  // Current week payment (PAID)
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6); // Sunday

  await prisma.barberPayment.create({
    data: {
      barberId: barber1.id,
      amount: 150,
      weekStart: currentWeekStart,
      weekEnd: currentWeekEnd,
      status: PaymentStatus.PAID,
      paidAt: new Date(),
      notes: 'Pago semanal - Semana actual',
    },
  });

  await prisma.barberPayment.create({
    data: {
      barberId: barber2.id,
      amount: 150,
      weekStart: currentWeekStart,
      weekEnd: currentWeekEnd,
      status: PaymentStatus.PAID,
      paidAt: new Date(),
      notes: 'Pago semanal - Semana actual',
    },
  });

  // Previous week payments (PAID)
  const prevWeekStart = new Date(currentWeekStart);
  prevWeekStart.setDate(currentWeekStart.getDate() - 7);
  const prevWeekEnd = new Date(currentWeekEnd);
  prevWeekEnd.setDate(currentWeekEnd.getDate() - 7);

  await prisma.barberPayment.create({
    data: {
      barberId: barber1.id,
      amount: 150,
      weekStart: prevWeekStart,
      weekEnd: prevWeekEnd,
      status: PaymentStatus.PAID,
      paidAt: new Date(prevWeekEnd),
      notes: 'Pago semanal - Semana anterior',
    },
  });

  await prisma.barberPayment.create({
    data: {
      barberId: barber2.id,
      amount: 150,
      weekStart: prevWeekStart,
      weekEnd: prevWeekEnd,
      status: PaymentStatus.PAID,
      paidAt: new Date(prevWeekEnd),
      notes: 'Pago semanal - Semana anterior',
    },
  });

  await prisma.barberPayment.create({
    data: {
      barberId: barber3.id,
      amount: 150,
      weekStart: prevWeekStart,
      weekEnd: prevWeekEnd,
      status: PaymentStatus.PAID,
      paidAt: new Date(prevWeekEnd),
      notes: 'Pago semanal - Semana anterior',
    },
  });

  // Pending payments for barber 3 and 4 (current week)
  await prisma.barberPayment.create({
    data: {
      barberId: barber3.id,
      amount: 150,
      weekStart: currentWeekStart,
      weekEnd: currentWeekEnd,
      status: PaymentStatus.PENDING,
      notes: 'Pago pendiente - Semana actual',
    },
  });

  await prisma.barberPayment.create({
    data: {
      barberId: barber4.id,
      amount: 150,
      weekStart: currentWeekStart,
      weekEnd: currentWeekEnd,
      status: PaymentStatus.PENDING,
      notes: 'Pago pendiente - Semana actual',
    },
  });

  console.log('✅ Created barber payments');

  // Create Expenses
  const thisMonth = new Date();
  const lastMonth = new Date(now);
  lastMonth.setMonth(now.getMonth() - 1);

  await prisma.expense.create({
    data: {
      category: ExpenseCategory.RENT,
      amount: 1200,
      description: 'Renta mensual del local',
      date: new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1),
      notes: 'Pago de renta del mes actual',
    },
  });

  await prisma.expense.create({
    data: {
      category: ExpenseCategory.UTILITIES_ELECTRICITY,
      amount: 180,
      description: 'Factura de electricidad',
      date: new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 5),
      notes: 'Consumo eléctrico del mes',
    },
  });

  await prisma.expense.create({
    data: {
      category: ExpenseCategory.UTILITIES_WATER,
      amount: 65,
      description: 'Factura de agua',
      date: new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 5),
      notes: 'Consumo de agua del mes',
    },
  });

  await prisma.expense.create({
    data: {
      category: ExpenseCategory.SUPPLIES,
      amount: 230,
      description: 'Productos de barbería (shampoo, gel, cera, etc.)',
      date: new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 10),
      notes: 'Reposición de suministros',
    },
  });

  await prisma.expense.create({
    data: {
      category: ExpenseCategory.MAINTENANCE,
      amount: 150,
      description: 'Reparación de silla de barbero',
      date: new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 15),
      notes: 'Mantenimiento de equipo',
    },
  });

  await prisma.expense.create({
    data: {
      category: ExpenseCategory.MARKETING,
      amount: 200,
      description: 'Publicidad en redes sociales',
      date: new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 12),
      notes: 'Campaña de marketing digital',
    },
  });

  // Last month expenses
  await prisma.expense.create({
    data: {
      category: ExpenseCategory.RENT,
      amount: 1200,
      description: 'Renta mensual del local',
      date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
      notes: 'Pago de renta del mes anterior',
    },
  });

  await prisma.expense.create({
    data: {
      category: ExpenseCategory.UTILITIES_ELECTRICITY,
      amount: 165,
      description: 'Factura de electricidad',
      date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 5),
      notes: 'Consumo eléctrico del mes anterior',
    },
  });

  await prisma.expense.create({
    data: {
      category: ExpenseCategory.SUPPLIES,
      amount: 180,
      description: 'Productos de barbería',
      date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 8),
      notes: 'Reposición de suministros mes anterior',
    },
  });

  console.log('✅ Created expenses');

  console.log('🎉 Seed completed successfully!');
  console.log('\n📋 Test Accounts:');
  console.log('   Admin 1: john@doe.com / johndoe123');
  console.log('   Admin 2: admin@barberia.com / Admin2024!');
  console.log('   Barber: miguel.santos@barberia.com / barber123');
  console.log('   Client: maria.garcia@example.com / client123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
