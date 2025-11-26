import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verificarDatos() {
  console.log('\n🔍 VERIFICANDO DATOS EN LA BASE DE DATOS\n');
  
  // Verificar administradores
  const admins = await prisma.administrador.findMany();
  console.log('👨‍💼 ADMINISTRADORES:', admins.length);
  admins.forEach(admin => {
    console.log(`   ✓ ${admin.nombre} (${admin.email})`);
  });

  // Verificar servicios
  const servicios = await prisma.servicio.findMany({ include: { administrador: true } });
  console.log('\n📺 SERVICIOS:', servicios.length);
  servicios.forEach(servicio => {
    console.log(`   ✓ ${servicio.nombre} - $${servicio.precio} (${servicio.categoria})`);
  });

  // Verificar métodos de pago
  const metodos = await prisma.metodoPago.findMany();
  console.log('\n💳 MÉTODOS DE PAGO:', metodos.length);
  metodos.forEach(metodo => {
    console.log(`   ✓ ${metodo.nombre} (${metodo.tipo})`);
  });

  // Verificar clientes
  const clientes = await prisma.cliente.findMany();
  console.log('\n👥 CLIENTES:', clientes.length);
  clientes.forEach(cliente => {
    console.log(`   ✓ ${cliente.nombre} (${cliente.email})`);
  });

  console.log('\n✅ Verificación completada\n');
  await prisma.$disconnect();
}

verificarDatos().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
