const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verificarPagosPendientes() {
  try {
    console.log('🔍 Verificando pagos pendientes...\n');

    const pagos = await prisma.pago.findMany({
      where: { estado: 'PENDIENTE' },
      include: { 
        cliente: true, 
        metodoPago: true,
        carrito: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`📊 Total pagos pendientes: ${pagos.length}\n`);

    pagos.forEach(pago => {
      console.log(`💰 Pago: ${pago.id}`);
      console.log(`   Cliente: ${pago.cliente.nombre} (${pago.cliente.email})`);
      console.log(`   Monto: $${pago.monto}`);
      console.log(`   Método: ${pago.metodoPago?.tipo || 'N/A'}`);
      console.log(`   Descripción: ${pago.descripcion || 'N/A'}`);
      console.log(`   Tiene carrito: ${pago.carrito ? 'SÍ' : 'NO'}`);
      if (pago.carrito) {
        console.log(`   Carrito activo: ${pago.carrito.activo}`);
      }
      console.log(`   Fecha: ${pago.createdAt}`);
      console.log('');
    });

    // Verificar si hay carritos activos con pagos pendientes
    const carritosActivos = await prisma.carrito.findMany({
      where: { 
        activo: true,
        pagos: {
          some: { estado: 'PENDIENTE' }
        }
      },
      include: {
        cliente: true,
        pagos: {
          where: { estado: 'PENDIENTE' }
        }
      }
    });

    console.log(`🛒 Carritos activos con pagos pendientes: ${carritosActivos.length}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarPagosPendientes();