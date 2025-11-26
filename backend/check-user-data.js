const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserData() {
  try {
    console.log('🔍 Consultando datos para usu@gmail.com...\n');
    
    // Buscar usuario
    const usuario = await prisma.usuario.findUnique({
      where: { email: 'usu@gmail.com' }
    });
    
    if (!usuario) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    console.log('👤 Usuario encontrado:', usuario.id);
    
    // Buscar pagos del usuario
    const pagos = await prisma.pago.findMany({
      where: { usuarioId: usuario.id },
      include: {
        items: {
          include: {
            servicio: true
          }
        }
      },
      orderBy: { fechaCreacion: 'desc' }
    });
    
    console.log('\n💳 Pagos del usuario:');
    pagos.forEach((pago, index) => {
      console.log(`   ${index + 1}. Pago ID: ${pago.id}`);
      console.log(`      Estado: ${pago.estado}`);
      console.log(`      Monto: $${pago.monto}`);
      console.log(`      Método: ${pago.metodoPago}`);
      console.log(`      Fecha: ${pago.fechaCreacion}`);
      console.log(`      Items: ${pago.items.length}`);
      pago.items.forEach((item, i) => {
        console.log(`        - ${item.servicio.nombre}: $${item.precio} (cantidad: ${item.cantidad})`);
      });
      console.log('');
    });
    
    // Buscar carritos del usuario
    const carritos = await prisma.carrito.findMany({
      where: { usuarioId: usuario.id },
      include: {
        items: {
          include: {
            servicio: true
          }
        }
      }
    });
    
    console.log('🛒 Carritos del usuario:');
    carritos.forEach((carrito, index) => {
      console.log(`   ${index + 1}. Carrito ID: ${carrito.id}`);
      console.log(`      Items: ${carrito.items.length}`);
      carrito.items.forEach((item, i) => {
        console.log(`        - ${item.servicio.nombre}: $${item.precio} (cantidad: ${item.cantidad})`);
      });
      console.log('');
    });
    
    // Buscar credenciales del usuario
    const credenciales = await prisma.credencialServicio.findMany({
      where: { usuarioId: usuario.id },
      include: {
        servicio: true
      }
    });
    
    console.log('🔑 Credenciales del usuario:');
    if (credenciales.length === 0) {
      console.log('   ❌ No se encontraron credenciales');
    } else {
      credenciales.forEach((cred, index) => {
        console.log(`   ${index + 1}. Servicio: ${cred.servicio.nombre}`);
        console.log(`      Usuario: ${cred.usuario}`);
        console.log(`      Contraseña: ${cred.contrasena}`);
        console.log(`      Estado: ${cred.estado}`);
        console.log(`      Fecha: ${cred.fechaCreacion}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserData();