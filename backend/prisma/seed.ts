import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const hashedAdminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.administrador.upsert({
    where: { email: 'admin@gmail.com' },
    update: {},
    create: {
      nombre: 'Administrador Principal',
      email: 'admin@gmail.com',
      password: hashedAdminPassword,
    },
  });

  console.log('✅ Admin user created:', admin.email);

  // Create payment methods
  const metodoPagos = [
    {
      nombre: 'Tarjeta de Crédito',
      tipo: 'TARJETA_CREDITO' as const,
      descripcion: 'Pago con tarjeta de crédito Visa, MasterCard, etc.',
    },
    {
      nombre: 'Tarjeta de Débito',
      tipo: 'TARJETA_DEBITO' as const,
      descripcion: 'Pago con tarjeta de débito',
    },
    {
      nombre: 'Transferencia Bancaria',
      tipo: 'TRANSFERENCIA' as const,
      descripcion: 'Transferencia bancaria directa',
    },
    {
      nombre: 'Código QR',
      tipo: 'QR' as const,
      descripcion: 'Pago mediante código QR',
    },
  ];

  try {
    await prisma.metodoPago.createMany({
      data: metodoPagos,
      skipDuplicates: true,
    });
  } catch (error) {
    console.log('Payment methods already exist or error creating them');
  }

  console.log('✅ Payment methods created');

  // Create sample services
  const servicios = [
    {
      nombre: 'Netflix Premium',
      descripcion: 'Servicio de streaming con contenido en 4K y múltiples pantallas',
      precio: 15.99,
      categoria: 'Entretenimiento',
      caracteristicas: ['4K Ultra HD', 'Múltiples pantallas', 'Descargas offline'],
      administradorId: admin.id,
    },
    {
      nombre: 'Spotify Premium',
      descripcion: 'Música sin límites y sin anuncios',
      precio: 9.99,
      categoria: 'Música',
      caracteristicas: ['Sin anuncios', 'Calidad alta', 'Descargas offline'],
      administradorId: admin.id,
    },
    {
      nombre: 'Disney+ Premium',
      descripcion: 'Todo el contenido de Disney, Marvel, Star Wars y más',
      precio: 12.99,
      categoria: 'Entretenimiento',
      caracteristicas: ['Contenido exclusivo', 'Múltiples perfiles', '4K disponible'],
      administradorId: admin.id,
    },
    {
      nombre: 'Amazon Prime Video',
      descripcion: 'Películas y series exclusivas de Amazon',
      precio: 8.99,
      categoria: 'Entretenimiento',
      caracteristicas: ['Contenido original', 'Múltiples dispositivos', 'HD/4K'],
      administradorId: admin.id,
    },
  ];

  // Create sample services
  try {
    await prisma.servicio.createMany({
      data: servicios,
      skipDuplicates: true,
    });
  } catch (error) {
    console.log('Services already exist or error creating them');
  }

  console.log('✅ Sample services created');

  // Create test client
  const hashedClientPassword = await bcrypt.hash('cliente123', 12);
  const cliente = await prisma.cliente.upsert({
    where: { email: 'cliente@test.com' },
    update: {},
    create: {
      nombre: 'Cliente de Prueba',
      email: 'cliente@test.com',
      password: hashedClientPassword,
      telefono: '+1234567890',
    },
  });

  console.log('✅ Test client created:', cliente.email);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });