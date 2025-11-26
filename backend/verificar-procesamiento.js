const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verificarProcesamiento() {
  try {
    console.log('🔍 VERIFICANDO PROCESAMIENTO DE PAGOS QR COMPLETADOS\n');

    // Buscar pagos QR completados recientes
    const pagosQRCompletados = await prisma.pago.findMany({
      where: {
        estado: 'COMPLETADO',
        metodoPago: {
          tipo: 'QR'
        },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
        }
      },
      include: {
        cliente: true,
        carrito: true,
        metodoPago: true,
        qr: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`📊 Pagos QR completados encontrados: ${pagosQRCompletados.length}\n`);

    for (const pago of pagosQRCompletados) {
      console.log(`💰 Pago: ${pago.id}`);
      console.log(`   Cliente: ${pago.cliente.nombre} (${pago.cliente.email})`);
      console.log(`   Monto: $${pago.monto}`);
      console.log(`   Estado: ${pago.estado}`);
      console.log(`   Método: ${pago.metodoPago.tipo}`);
      console.log(`   Fecha: ${pago.createdAt}`);
      console.log(`   Tiene QR: ${pago.qr ? 'SÍ' : 'NO'}`);
      
      if (pago.qr) {
        console.log(`   Estado QR: ${pago.qr.estado}`);
      }
      
      console.log(`   Tiene Carrito: ${pago.carrito && pago.carrito.length > 0 ? 'SÍ' : 'NO'}`);
      
      if (pago.carrito && pago.carrito.length > 0) {
        const carrito = pago.carrito[0];
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
      
      // Verificar suscripciones creadas para este pago
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
      
      console.log(`   Suscripciones Creadas: ${suscripciones.length}`);
      suscripciones.forEach(sub => {
        console.log(`      - ${sub.servicio.nombre} (${sub.credenciales.length} credenciales)`);
      });
      
      // Verificar si el carrito sigue activo (problema)
      if (pago.carrito && pago.carrito.length > 0) {
        const carrito = pago.carrito[0];
        if (carrito.activo && suscripciones.length > 0) {
          console.log(`   ⚠️  PROBLEMA: Carrito activo con suscripciones creadas`);
        } else if (!carrito.activo && suscripciones.length === 0) {
          console.log(`   ⚠️  PROBLEMA: Carrito inactivo sin suscripciones`);
        } else if (!carrito.activo && suscripciones.length > 0) {
          console.log(`   ✅ OK: Carrito inactivo con suscripciones creadas`);
        } else {
          console.log(`   ℹ️  Estado: Carrito activo sin suscripciones`);
        }
      }
      
      console.log('');
    }

    // Verificar credenciales asignadas recientemente
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

    // Resumen de problemas
    console.log('📋 RESUMEN DE PROBLEMAS:');
    
    const carritosActivosConPagosCompletados = await prisma.carrito.findMany({
      where: { 
        activo: true,
        pagos: {
          some: { estado: 'COMPLETADO' }
        }
      },
      include: {
        cliente: true,
        pagos: {
          where: { estado: 'COMPLETADO' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    console.log(`   Carritos activos con pagos completados: ${carritosActivosConPagosCompletados.length}`);
    
    carritosActivosConPagosCompletados.forEach(carrito => {
      if (carrito.pagos.length > 0) {
        const pago = carrito.pagos[0];
        console.log(`   - Cliente ${carrito.cliente.nombre}: Carrito activo con pago ${pago.id} completado`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarProcesamiento();