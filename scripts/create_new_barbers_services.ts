/**
 * CREAR NUEVOS BARBEROS, ESTILISTAS Y SERVICIOS
 * 
 * Este script crea desde cero:
 * - 2 Barberos MALE (Miguel Santos, José Rodríguez)
 * - 2 Estilistas FEMALE (Celeste Paulino, Sandra Paez)
 * - 8 Servicios MALE
 * - 10 Servicios FEMALE
 * - 2 Servicios UNISEX
 * 
 * ESTRUCTURA SIMPLE:
 * - Barberos NO tienen servicios propios
 * - Todos usan servicios generales según su género
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🚀 CREANDO NUEVOS BARBEROS, ESTILISTAS Y SERVICIOS...\n');

  try {
    // ========================================
    // 1. CREAR SERVICIOS MALE (8)
    // ========================================
    console.log('✂️  Creando servicios para hombres (MALE)...');
    
    const maleServices = [
      {
        name: 'Haircut',
        description: 'Classic men\'s haircut with precision and style',
        price: 35,
        duration: 30,
        gender: 'MALE' as const,
        image: null,
      },
      {
        name: 'Haircut & Beard',
        description: 'Complete grooming: haircut + beard trim',
        price: 45,
        duration: 45,
        gender: 'MALE' as const,
        image: null,
      },
      {
        name: 'Kids Haircut',
        description: 'Haircut for kids (12 and under)',
        price: 25,
        duration: 25,
        gender: 'MALE' as const,
        image: null,
      },
      {
        name: 'Beard Trim',
        description: 'Professional beard shaping and trimming',
        price: 20,
        duration: 20,
        gender: 'MALE' as const,
        image: null,
      },
      {
        name: 'Hot Towel Shave',
        description: 'Traditional hot towel shave experience',
        price: 30,
        duration: 30,
        gender: 'MALE' as const,
        image: null,
      },
      {
        name: 'Lineup',
        description: 'Edge up and hairline touch-up',
        price: 15,
        duration: 15,
        gender: 'MALE' as const,
        image: null,
      },
      {
        name: 'Haircut with Designs',
        description: 'Creative haircut with custom designs',
        price: 45,
        duration: 45,
        gender: 'MALE' as const,
        image: null,
      },
      {
        name: 'Facial Treatment',
        description: 'Relaxing facial treatment and skin care',
        price: 45,
        duration: 40,
        gender: 'MALE' as const,
        image: null,
      },
    ];

    for (const service of maleServices) {
      await prisma.service.create({ data: service });
      console.log(`   ✅ ${service.name} ($${service.price})`);
    }

    // ========================================
    // 2. CREAR SERVICIOS FEMALE (10)
    // ========================================
    console.log('\n✂️  Creando servicios para mujeres (FEMALE)...');
    
    const femaleServices = [
      {
        name: 'Women\'s Haircut',
        description: 'Professional women\'s haircut and styling',
        price: 45,
        duration: 45,
        gender: 'FEMALE' as const,
        image: null,
      },
      {
        name: 'Blowout',
        description: 'Professional blow dry and styling',
        price: 40,
        duration: 40,
        gender: 'FEMALE' as const,
        image: null,
      },
      {
        name: 'Hair Styling',
        description: 'Creative styling for special occasions',
        price: 50,
        duration: 50,
        gender: 'FEMALE' as const,
        image: null,
      },
      {
        name: 'Updo',
        description: 'Elegant updo hairstyle',
        price: 65,
        duration: 60,
        gender: 'FEMALE' as const,
        image: null,
      },
      {
        name: 'Balayage',
        description: 'Hand-painted highlights for natural look',
        price: 120,
        duration: 180,
        gender: 'FEMALE' as const,
        image: null,
      },
      {
        name: 'Color Treatment',
        description: 'Full color application',
        price: 80,
        duration: 120,
        gender: 'FEMALE' as const,
        image: null,
      },
      {
        name: 'Highlights',
        description: 'Professional highlights',
        price: 100,
        duration: 150,
        gender: 'FEMALE' as const,
        image: null,
      },
      {
        name: 'Keratin Treatment',
        description: 'Smoothing and strengthening treatment',
        price: 150,
        duration: 180,
        gender: 'FEMALE' as const,
        image: null,
      },
      {
        name: 'Women\'s Cut & Color',
        description: 'Complete haircut and color service',
        price: 120,
        duration: 150,
        gender: 'FEMALE' as const,
        image: null,
      },
      {
        name: 'Hair Extensions',
        description: 'Professional hair extension installation',
        price: 200,
        duration: 240,
        gender: 'FEMALE' as const,
        image: null,
      },
    ];

    for (const service of femaleServices) {
      await prisma.service.create({ data: service });
      console.log(`   ✅ ${service.name} ($${service.price})`);
    }

    // ========================================
    // 3. CREAR SERVICIOS UNISEX (2)
    // ========================================
    console.log('\n✂️  Creando servicios unisex (UNISEX)...');
    
    const unisexServices = [
      {
        name: 'Hair Color',
        description: 'Professional hair color service',
        price: 70,
        duration: 90,
        gender: 'UNISEX' as const,
        image: null,
      },
      {
        name: 'Deep Conditioning',
        description: 'Intensive conditioning treatment',
        price: 35,
        duration: 30,
        gender: 'UNISEX' as const,
        image: null,
      },
    ];

    for (const service of unisexServices) {
      await prisma.service.create({ data: service });
      console.log(`   ✅ ${service.name} ($${service.price})`);
    }

    // ========================================
    // 4. CREAR BARBEROS MALE (2)
    // ========================================
    console.log('\n👨‍🦱 Creando barberos (MALE)...');

    // Barbero 1: Miguel Santos
    const miguel = await prisma.user.upsert({
      where: { email: 'miguel.santos@barberia.com' },
      update: {
        role: 'BARBER',
        gender: 'MALE',
      },
      create: {
        email: 'miguel.santos@barberia.com',
        password: await bcrypt.hash('barber123', 10),
        name: 'Miguel Santos',
        role: 'BARBER',
        gender: 'MALE',
        image: 'https://i.pravatar.cc/300?img=12',
      },
    });

    await prisma.barber.create({
      data: {
        userId: miguel.id,
        bio: 'Expert in fades, designs, and modern men\'s styles. 10+ years of experience.',
        specialties: 'Fades, Designs, Beard Grooming',
        hourlyRate: 35,
        rating: 4.9,
        instagramUrl: 'https://instagram.com/miguelsantos',
        facebookUrl: 'https://facebook.com/miguelsantos',
        tiktokUrl: 'https://tiktok.com/@miguelsantos',
        zelleEmail: 'miguel.santos@zelle.com',
        zellePhone: '+1-555-0101',
        cashappTag: '$MiguelSantos',
        gender: 'MALE',
      },
    });
    console.log(`   ✅ Miguel Santos - @miguelsantos`);

    // Barbero 2: José Rodríguez
    const jose = await prisma.user.upsert({
      where: { email: 'jose.rodriguez@barberia.com' },
      update: {
        role: 'BARBER',
        gender: 'MALE',
      },
      create: {
        email: 'jose.rodriguez@barberia.com',
        password: await bcrypt.hash('barber123', 10),
        name: 'José Rodríguez',
        role: 'BARBER',
        gender: 'MALE',
        image: 'https://i.pravatar.cc/300?img=33',
      },
    });

    await prisma.barber.create({
      data: {
        userId: jose.id,
        bio: 'Traditional barber specializing in classic cuts and hot towel shaves.',
        specialties: 'Classic Cuts, Hot Towel Shaves, Beard Trims',
        hourlyRate: 35,
        rating: 4.8,
        instagramUrl: 'https://instagram.com/josebarber',
        facebookUrl: 'https://facebook.com/joserodriguez',
        tiktokUrl: 'https://tiktok.com/@josebarber',
        zelleEmail: 'jose.rodriguez@zelle.com',
        zellePhone: '+1-555-0102',
        cashappTag: '$JoseBarber',
        gender: 'MALE',
      },
    });
    console.log(`   ✅ José Rodríguez - @josebarber`);

    // ========================================
    // 5. CREAR ESTILISTAS FEMALE (2)
    // ========================================
    console.log('\n👩‍🎫 Creando estilistas (FEMALE)...');

    // Estilista 1: Celeste Paulino
    const celeste = await prisma.user.upsert({
      where: { email: 'celeste.paulino@barberia.com' },
      update: {
        role: 'BARBER',
        gender: 'FEMALE',
      },
      create: {
        email: 'celeste.paulino@barberia.com',
        password: await bcrypt.hash('barber123', 10),
        name: 'Celeste Paulino',
        role: 'BARBER',
        gender: 'FEMALE',
        image: 'https://i.pravatar.cc/300?img=47',
      },
    });

    await prisma.barber.create({
      data: {
        userId: celeste.id,
        bio: 'Professional stylist specializing in color, balayage, and modern women\'s styles.',
        specialties: 'Balayage, Color Treatments, Women\'s Cuts',
        hourlyRate: 45,
        rating: 5.0,
        instagramUrl: 'https://instagram.com/celestestylist',
        facebookUrl: 'https://facebook.com/celestepaulino',
        tiktokUrl: 'https://tiktok.com/@celestehair',
        zelleEmail: 'celeste.paulino@zelle.com',
        zellePhone: '+1-555-0103',
        cashappTag: '$CelesteStylist',
        gender: 'FEMALE',
      },
    });
    console.log(`   ✅ Celeste Paulino - @celestestylist`);

    // Estilista 2: Sandra Paez
    const sandra = await prisma.user.upsert({
      where: { email: 'sandra.paez@barberia.com' },
      update: {
        role: 'BARBER',
        gender: 'FEMALE',
      },
      create: {
        email: 'sandra.paez@barberia.com',
        password: await bcrypt.hash('barber123', 10),
        name: 'Sandra Paez',
        role: 'BARBER',
        gender: 'FEMALE',
        image: 'https://i.pravatar.cc/300?img=45',
      },
    });

    await prisma.barber.create({
      data: {
        userId: sandra.id,
        bio: 'Expert in blowouts, updos, and special occasion styling. Making women feel beautiful!',
        specialties: 'Blowouts, Updos, Hair Styling',
        hourlyRate: 45,
        rating: 4.9,
        instagramUrl: 'https://instagram.com/sandrahair',
        facebookUrl: 'https://facebook.com/sandrapaez',
        tiktokUrl: 'https://tiktok.com/@sandrastylist',
        zelleEmail: 'sandra.paez@zelle.com',
        zellePhone: '+1-555-0104',
        cashappTag: '$SandraStylist',
        gender: 'FEMALE',
      },
    });
    console.log(`   ✅ Sandra Paez - @sandrahair`);

    // ========================================
    // RESUMEN FINAL
    // ========================================
    console.log('\n✅ ¡CREACIÓN COMPLETADA EXITOSAMENTE!\n');
    console.log('📊 Resumen:');
    console.log(`   - Servicios MALE creados: ${maleServices.length}`);
    console.log(`   - Servicios FEMALE creados: ${femaleServices.length}`);
    console.log(`   - Servicios UNISEX creados: ${unisexServices.length}`);
    console.log(`   - Barberos MALE creados: 2`);
    console.log(`   - Estilistas FEMALE creadas: 2`);
    console.log('\n🔑 Credenciales:');
    console.log('   Email: miguel.santos@barberia.com | Password: barber123');
    console.log('   Email: jose.rodriguez@barberia.com | Password: barber123');
    console.log('   Email: celeste.paulino@barberia.com | Password: barber123');
    console.log('   Email: sandra.paez@barberia.com | Password: barber123');
    console.log('\n✅ El sistema está listo para usar.\n');

  } catch (error) {
    console.error('\n❌ ERROR durante la creación:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
