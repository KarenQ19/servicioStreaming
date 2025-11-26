const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugSimple() {
  try {
    console.log('🔍 DEBUG SIMPLIFICADO\n');

    // Verificar pagos completados recientes
    console.log('📋 PAGOS COMPLETADOS RECIENTES:');
    const pagos = await prisma.pago.findMany({
      where: { estado: 'COMPLETADO' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        cliente: true,
        carrito: true,
        metodoPago: true
      }
    });

    for (const pago of pagos) {
      console.log(`\n💰 Pago: ${pago.id}`);
      console.log(`   Cliente: ${pago.cliente.nombre}`);
      console.log(`   Monto: $${pago.monto}`);
      console.log(`   Estado: ${pago.estado}`);
      console.log(`   Método: ${pago.metodoPago?.tipo || 'N/A'}`);
      console.log(`   Tiene carrito: ${pago.carrito ? 'SÍ' : 'NO'}`);
      if (pago.carrito) {
        console.log(`   Carrito activo: ${pago.carrito.activo}`);
        
        // Ver items del carrito
        const items = await prisma.carritoItem.findMany({
          where: { carritoId: pago.carrito.id },
          include: { servicio: true }
        });
        console.log(`   Items en carrito: ${items.length}`);
        items.forEach(item => {
          console.log(`     - ${item.servicio.nombre}: $${item.servicio.precio}`);
        });
      }
      
      // Ver suscripciones de este cliente
      const suscripciones = await prisma.suscripcion.findMany({
        where: { 
          clienteId: pago.clienteId,
          pagos: {
            some: { id: pago.id }
          }
        },
        include: { 
          servicio: true,
          credenciales: {
            where: { asignadas: true }
          }
        }
      });
      
      console.log(`   Suscripciones creadas para este pago: ${suscripciones.length}`);
      suscripciones.forEach(sub => {
        console.log(`     - ${sub.servicio.nombre} (${sub.credenciales.length} credenciales)`);
      });
    }

    // Verificar carritos activos con pagos completados
    console.log('\n\n🛒 CARRITOS ACTIVOS CON PAGOS COMPLETADOS:');
    const carritosActivos = await prisma.carrito.findMany({
      where: { activo: true },
      include: {
        cliente: true,
        pagos: {
          where: { estado: 'COMPLETADO' },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    carritosActivos.forEach(carrito => {
      if (carrito.pagos.length > 0) {
        console.log(`\n🛒 Carrito: ${carrito.id}`);
        console.log(`   Cliente: ${carrito.cliente.nombre}`);
        console.log(`   Pagos completados: ${carrito.pagos.length}`);
        console.log(`   Último pago: ${carrito.pagos[0].id} - $${carrito.pagos[0].monto}`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSimple();