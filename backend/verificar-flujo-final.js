const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verificarFlujoFinal() {
  try {
    console.log('🧪 VERIFICANDO FLUJO FINAL\n');

    // 1. Verificar pagos QR recientes
    console.log('📋 PAGOS QR RECIENTES:');
    const pagosQR = await prisma.pago.findMany({
      where: {
        metodoPago: {
          tipo: 'QR'
        }
      },
      include: {
        cliente: true,
        metodoPago: true,
        carrito: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log(`   Total: ${pagosQR.length}\n`);
    
    for (const pago of pagosQR) {
      console.log(`   💰 Pago: ${pago.id}`);
      console.log(`      Cliente: ${pago.cliente.nombre}`);
      console.log(`      Monto: $${pago.monto}`);
      console.log(`      Estado: ${pago.estado}`);
      console.log(`      Tiene carrito: ${pago.carrito ? 'SÍ' : 'NO'}`);
      
      if (pago.carrito && pago.carrito.length > 0) {
        const carrito = pago.carrito[0];
        console.log(`      Carrito activo: ${carrito.activo}`);
        
        // Ver items
        const items = await prisma.carritoItem.findMany({
          where: { carritoId: carrito.id },
          include: { servicio: true }
        });
        
        console.log(`      Items: ${items.length}`);
        items.forEach(item => {
          console.log(`         - ${item.servicio.nombre}: $${item.servicio.precio}`);
        });
      }
      
      // Ver suscripciones
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
      
      console.log(`      Suscripciones: ${suscripciones.length}`);
      suscripciones.forEach(sub => {
        console.log(`         - ${sub.servicio.nombre} (${sub.credenciales.length} credenciales)`);
      });
      
      console.log('');
    }

    // 2. Verificar credenciales asignadas recientemente
    console.log('🔑 CREDENCIALES ASIGNADAS RECIENTEMENTE:');
    const credenciales = await prisma.credenciales.findMany({
      where: {
        asignadas: true,
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
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

    console.log(`   Total: ${credenciales.length}\n`);
    credenciales.forEach(cred => {
      console.log(`   🔑 ${cred.usuario}`);
      console.log(`      Servicio: ${cred.servicio.nombre}`);
      console.log(`      Cliente: ${cred.cliente?.nombre || 'Sin cliente'}`);
      console.log(`      Suscripción: ${cred.suscripcionId ? 'SÍ' : 'NO'}`);
      console.log('');
    });

    // 3. Verificar carritos activos con pagos completados
    console.log('🛒 CARRITOS ACTIVOS CON PAGOS COMPLETADOS:');
    const carritosActivos = await prisma.carrito.findMany({
      where: { activo: true },
      include: {
        cliente: true,
        pagos: {
          where: { estado: 'COMPLETADO' }
        }
      }
    });

    const carritosConProblema = carritosActivos.filter(c => c.pagos.length > 0);
    console.log(`   Carritos con problema: ${carritosConProblema.length}\n`);
    
    carritosConProblema.forEach(carrito => {
      console.log(`   🛒 Carrito: ${carrito.id}`);
      console.log(`      Cliente: ${carrito.cliente.nombre}`);
      console.log(`      Pagos completados: ${carrito.pagos.length}`);
      console.log('');
    });

    console.log('✅ Verificación completada!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarFlujoFinal();