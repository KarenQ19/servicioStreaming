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
      id: 'cmibvqrh60000ey8olhjpmxsr',
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
      descripcion: 'Streaming 4K con múltiples pantallas y descargas offline',
      precio: 15.99,
      categoria: 'Entretenimiento',
      disponible: true,
      caracteristicas: { resolucion: '4K', perfiles: 4, descargas: true },
      administradorId: admin.id,
    },
    {
      nombre: 'Disney+ Premium',
      descripcion: 'Catálogo Disney, Marvel, Star Wars en 4K HDR',
      precio: 12.99,
      categoria: 'Familia',
      disponible: true,
      caracteristicas: { resolucion: '4K', perfiles: 4, descargas: true },
      administradorId: admin.id,
    },
    {
      nombre: 'HBO Max 4K',
      descripcion: 'Series originales y cine en 4K con Dolby Vision',
      precio: 14.99,
      categoria: 'Entretenimiento',
      disponible: true,
      caracteristicas: { resolucion: '4K', perfiles: 3, descargas: true },
      administradorId: admin.id,
    },
    {
      nombre: 'Amazon Prime Video',
      descripcion: 'Streaming con envíos Prime incluidos',
      precio: 8.99,
      categoria: 'Entretenimiento',
      disponible: true,
      caracteristicas: { resolucion: '4K', perfiles: 3, descargas: true },
      administradorId: admin.id,
    },
    {
      nombre: 'Hulu Sin Anuncios',
      descripcion: 'Series actuales y TV en vivo sin anuncios',
      precio: 11.99,
      categoria: 'TV en vivo',
      disponible: true,
      caracteristicas: { resolucion: 'Full HD', perfiles: 2, descargas: true },
      administradorId: admin.id,
    },
    {
      nombre: 'Apple TV+',
      descripcion: 'Producciones originales en 4K HDR',
      precio: 6.99,
      categoria: 'Originales',
      disponible: true,
      caracteristicas: { resolucion: '4K HDR', perfiles: 6, descargas: true },
      administradorId: admin.id,
    },
    {
      nombre: 'Paramount+ Premium',
      descripcion: 'Series, cine y deportes en vivo',
      precio: 9.99,
      categoria: 'Entretenimiento',
      disponible: true,
      caracteristicas: { resolucion: 'Full HD', perfiles: 3, descargas: true },
      administradorId: admin.id,
    },
    {
      nombre: 'Peacock Premium',
      descripcion: 'Series, cine y deportes de NBC/Universal',
      precio: 7.99,
      categoria: 'TV y deportes',
      disponible: true,
      caracteristicas: { resolucion: 'Full HD', perfiles: 3, descargas: true },
      administradorId: admin.id,
    },
    {
      nombre: 'Crunchyroll Mega Fan',
      descripcion: 'Anime sin anuncios con simulcast y descargas',
      precio: 9.99,
      categoria: 'Anime',
      disponible: true,
      caracteristicas: { resolucion: 'Full HD', perfiles: 2, simulcast: true, descargas: true },
      administradorId: admin.id,
    },
    {
      nombre: 'Star+ Deportes',
      descripcion: 'Series, cine y ligas deportivas en vivo',
      precio: 13.99,
      categoria: 'Deportes',
      disponible: true,
      caracteristicas: { resolucion: 'Full HD', perfiles: 4, simultaneas: 4 },
      administradorId: admin.id,
    },
    {
      nombre: 'YouTube Premium',
      descripcion: 'Videos sin anuncios, descargas y YouTube Music',
      precio: 11.99,
      categoria: 'Video/Música',
      disponible: true,
      caracteristicas: { resolucion: '4K', perfiles: 5, descargas: true },
      administradorId: admin.id,
    },
    {
      nombre: 'Spotify Premium Duo',
      descripcion: 'Música en 320kbps para 2 cuentas',
      precio: 12.99,
      categoria: 'Música',
      disponible: true,
      caracteristicas: { audio: '320kbps', perfiles: 2, descargas: true },
      administradorId: admin.id,
    },
    {
      nombre: 'Deezer HiFi',
      descripcion: 'Música en FLAC sin anuncios',
      precio: 10.99,
      categoria: 'Música',
      disponible: true,
      caracteristicas: { audio: 'FLAC', perfiles: 1, descargas: true },
      administradorId: admin.id,
    },
    {
      nombre: 'DAZN Deportes',
      descripcion: 'Streaming de deportes en vivo y on demand',
      precio: 19.99,
      categoria: 'Deportes',
      disponible: true,
      caracteristicas: { resolucion: 'Full HD', simultaneas: 2, descargas: false },
      administradorId: admin.id,
    },
    {
      nombre: 'Pluto TV Plus',
      descripcion: 'Canales gratuitos con opción premium sin anuncios',
      precio: 5.99,
      categoria: 'TV en vivo',
      disponible: true,
      caracteristicas: { resolucion: 'Full HD', perfiles: 2, descargas: false },
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
