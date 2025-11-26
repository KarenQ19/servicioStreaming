const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verificarFlujoCorregido() {
  try {
    console.log('🧪 VERIFICANDO FLUJO CORREGIDO\n');

    // 1. Verificar que hay carritos activos con items
    console.log('1. Verificando carritos activos con items...');
    const carritosActivos = await prisma.carrito.findMany({
      where: { activo: true },
      include: {
        cliente: true,
        items: {
          include: { servicio: true }
        }
      },
      take: 5
    });

    console.log(`   Carritos activos encontrados: ${carritosActivos.length}\n`);

    // 2. Para cada carrito activo, verificar si tiene pagos pendientes
    for (const carrito of carritosActivos) {
      console.log(`   🛒 Carrito: ${carrito.id}`);
      console.log(`      Cliente: ${carrito.cliente.nombre}`);
      console.log(`      Items: ${carrito.items.length}`);
      
      if (carrito.items.length > 0) {
        carrito.items.forEach(item => {
          console.log(`         - ${item.servicio.nombre}: $${item.servicio.precio}`);
        });

        // Ver pagos asociados
        const pagos = await prisma.pago.findMany({
          where: {
            clienteId: carrito.clienteId,
            carrito: {
              some: { id: carrito.id }
            }
          },
          include: { metodoPago: true }
        });

        console.log(`      Pagos: ${pagos.length}`);
        pagos.forEach(pago => {
          console.log(`         - ${pago.id}: ${pago.estado} - $${pago.monto} (${pago.metodoPago?.tipo})`);
        });

        // Verificar si hay pagos pendientes
        const pagosPendientes = pagos.filter(p => p.estado === 'PENDIENTE');
        if (pagosPendientes.length > 0) {
          console.log(`      ✅ Hay pagos pendientes para este carrito`);
        } else {
          console.log(`      ⚠️  No hay pagos pendientes para este carrito`);
        }
      }
      console.log('');
    }

    // 3. Verificar pagos QR recientes
    console.log('2. Verificando pagos QR recientes...');
    const pagosQR = await prisma.pago.findMany({
      where: {
        metodoPago: {
          tipo: 'QR'
        }
      },
      include: {
        cliente: true,
        metodoPago: true,
        carrito: true,
        _count: {
          select: {
            suscripcion: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log(`   Pagos QR encontrados: ${pagosQR.length}\n`);
    pagosQR.forEach(pago => {
      console.log(`   💰 Pago QR: ${pago.id}`);
      console.log(`      Cliente: ${pago.cliente.nombre}`);
      console.log(`      Monto: $${pago.monto}`);
      console.log(`      Estado: ${pago.estado}`);
      console.log(`      Tiene carrito: ${pago.carrito.length > 0 ? 'SÍ' : 'NO'}`);
      console.log(`      Suscripciones: ${pago._count.suscripcion}`);
      
      if (pago.carrito.length > 0) {
        console.log(`      Carritos asociados: ${pago.carrito.length}`);
        pago.carrito.forEach(c => {
          console.log(`         - ${c.id}: ${c.activo ? 'Activo' : 'Inactivo'}`);
        });
      }
      console.log('');
    });

    // 4. Verificar credenciales asignadas recientemente
    console.log('3. Verificando credenciales asignadas recientemente...');
    const credencialesRecientes = await prisma.credenciales.findMany({
      where: {
        asignadas: true,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
        }
      },
      include: {
        cliente: true,
        servicio: true,
        suscripcion: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 10
    });

    console.log(`   Credenciales asignadas recientemente: ${credencialesRecientes.length}\n`);
    credencialesRecientes.forEach(cred => {
      console.log(`   🔑 Credencial: ${cred.usuario}`);
      console.log(`      Servicio: ${cred.servicio.nombre}`);
      console.log(`      Cliente: ${cred.cliente?.nombre || 'Sin cliente'}`);
      console.log(`      Suscripción: ${cred.suscripcionId || 'Sin suscripción'}`);
      console.log('');
    });

    console.log('✅ Verificación completada!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarFlujoCorregido();