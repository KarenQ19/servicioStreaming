const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verificarQR() {
  try {
    console.log('🔍 Verificando estado del QR: cmhk1tjwq0010rxlttwkb0kih\n');

    const qr = await prisma.qR.findUnique({
      where: { codigo: 'cmhk1tjwq0010rxlttwkb0kih' },
      include: { 
        pago: {
          include: {
            cliente: true,
            carrito: true,
            metodoPago: true
          }
        }
      }
    });

    if (!qr) {
      console.log('❌ QR no encontrado');
      return;
    }

    console.log('📊 Estado del QR:');
    console.log(`   Código: ${qr.codigo}`);
    console.log(`   Estado: ${qr.estado}`);
    console.log(`   Expira: ${qr.expiresAt}`);
    console.log(`   Pago ID: ${qr.pagoId}`);
    console.log(`   Pago Estado: ${qr.pago?.estado}`);
    console.log(`   Pago Monto: $${qr.pago?.monto}`);
    console.log(`   Cliente: ${qr.pago?.cliente?.nombre}`);
    console.log(`   Método: ${qr.pago?.metodoPago?.tipo}`);
    console.log(`   Tiene Carrito: ${qr.pago?.carrito?.length > 0 ? 'SÍ' : 'NO'}`);

    if (qr.pago?.carrito?.length > 0) {
      const carrito = qr.pago.carrito[0];
      console.log(`   Carrito Activo: ${carrito.activo}`);
      
      // Ver items del carrito
      const items = await prisma.carritoItem.findMany({
        where: { carritoId: carrito.id },
        include: { servicio: true }
      });
      
      console.log(`   Items en Carrito: ${items.length}`);
      items.forEach(item => {
        console.log(`      - ${item.servicio.nombre}: $${item.servicio.precio}`);
      });
    }

    // Verificar suscripciones relacionadas
    console.log('\n📄 Suscripciones del cliente:');
    const suscripciones = await prisma.suscripcion.findMany({
      where: { 
        clienteId: qr.pago.clienteId,
        pagos: {
          some: { id: qr.pagoId }
        }
      },
      include: { 
        servicio: true,
        credenciales: {
          where: { asignadas: true }
        }
      }
    });

    console.log(`   Total Suscripciones: ${suscripciones.length}`);
    suscripciones.forEach(sub => {
      console.log(`   - ${sub.servicio.nombre} (${sub.credenciales.length} credenciales)`);
    });

    // Verificar si hay carritos activos con este pago completado
    console.log('\n🛒 Carritos activos del cliente:');
    const carritosActivos = await prisma.carrito.findMany({
      where: { 
        clienteId: qr.pago.clienteId,
        activo: true
      },
      include: {
        pagos: {
          where: { estado: 'COMPLETADO' }
        }
      }
    });

    console.log(`   Carritos Activos: ${carritosActivos.length}`);
    carritosActivos.forEach(carrito => {
      console.log(`   - ${carrito.id}: ${carrito.pagos.length} pagos completados`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarQR();