const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugPaymentFlow() {
  try {
    console.log('🔍 DEBUG: Análisis completo del flujo de pagos\n');

    // 1. Verificar pagos COMPLETADOS con QR
    console.log('📋 PAGOS COMPLETADOS CON QR:');
    const pagosCompletados = await prisma.pago.findMany({
      where: {
        estado: 'COMPLETADO',
        metodoPago: {
          tipo: 'QR'
        }
      },
      include: {
        cliente: true,
        metodoPago: true,
        carrito: {
          include: {
            items: {
              include: {
                servicio: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    for (const pago of pagosCompletados) {
      console.log(`\n💰 Pago ID: ${pago.id}`);
      console.log(`   Cliente: ${pago.cliente.nombre} (${pago.cliente.email})`);
      console.log(`   Monto: $${pago.monto}`);
      console.log(`   Estado: ${pago.estado}`);
      console.log(`   Carrito activo: ${pago.carrito?.activo || 'N/A'}`);
      console.log(`   Items en carrito: ${pago.carrito?.items?.length || 0}`);
      
      // Verificar suscripciones para este pago
      const suscripcionesCount = await prisma.suscripcion.count({
        where: {
          pagos: {
            some: {
              id: pago.id
            }
          }
        }
      });
      console.log(`   Suscripciones creadas: ${suscripcionesCount}`);
      
      if (pago.carrito?.items) {
        pago.carrito.items.forEach(item => {
          console.log(`   - ${item.servicio.nombre}: $${item.servicio.precio}`);
        });
      }
    }

    // 2. Verificar carritos activos de clientes con pagos completados
    console.log('\n\n🛒 CARRITOS ACTIVOS DE CLIENTES CON PAGOS COMPLETADOS:');
    const carritosActivos = await prisma.carrito.findMany({
      where: {
        activo: true,
        cliente: {
          pagos: {
            some: {
              estado: 'COMPLETADO'
            }
          }
        }
      },
      include: {
        cliente: true,
        items: {
          include: {
            servicio: true
          }
        },
        pago: {
          where: {
            estado: 'COMPLETADO'
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    carritosActivos.forEach(carrito => {
      console.log(`\n🛒 Carrito ID: ${carrito.id}`);
      console.log(`   Cliente: ${carrito.cliente.nombre} (${carrito.cliente.email})`);
      console.log(`   Activo: ${carrito.activo}`);
      console.log(`   Items: ${carrito.items.length}`);
      if (carrito.pago.length > 0) {
        console.log(`   Último pago completado: ${carrito.pago[0].id} - $${carrito.pago[0].monto}`);
      }
    });

    // 3. Verificar suscripciones creadas recientemente
    console.log('\n\n📄 SUSCRIPCIONES CREADAS RECIENTEMENTE:');
    const suscripciones = await prisma.suscripcion.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        cliente: true,
        servicio: true,
        pago: true,
        credenciales: {
          where: {
            asignadas: true
          }
        }
      }
    });

    suscripciones.forEach(suscripcion => {
      console.log(`\n📄 Suscripción ID: ${suscripcion.id}`);
      console.log(`   Cliente: ${suscripcion.cliente.nombre}`);
      console.log(`   Servicio: ${suscripcion.servicio.nombre}`);
      console.log(`   Estado: ${suscripcion.estado}`);
      console.log(`   Pago ID: ${suscripcion.pagoId}`);
      console.log(`   Credenciales asignadas: ${suscripcion.credenciales.length}`);
    });

    // 4. Verificar credenciales asignadas recientemente
    console.log('\n\n🔑 CREDENCIALES ASIGNADAS RECIENTEMENTE:');
    const credencialesAsignadas = await prisma.credenciales.findMany({
      where: {
        asignadas: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: {
        cliente: true,
        servicio: true,
        suscripcion: true
      }
    });

    credencialesAsignadas.forEach(credencial => {
      console.log(`\n🔑 Credencial ID: ${credencial.id}`);
      console.log(`   Usuario: ${credencial.usuario}`);
      console.log(`   Servicio: ${credencial.servicio.nombre}`);
      console.log(`   Cliente: ${credencial.cliente?.nombre || 'Sin cliente'}`);
      console.log(`   Suscripción: ${credencial.suscripcionId || 'Sin suscripción'}`);
      console.log(`   Asignada: ${credencial.asignadas}`);
      console.log(`   Activa: ${credencial.activas}`);
    });

    // 5. Verificar si hay pagos completados sin procesar
    console.log('\n\n⚠️  PAGOS COMPLETADOS QUE PUEDEN NECESITAR PROCESAMIENTO:');
    const pagosSinProcesar = await prisma.pago.findMany({
      where: {
        estado: 'COMPLETADO',
        carrito: {
          activo: true
        }
      },
      include: {
        cliente: true,
        carrito: {
          include: {
            items: true
          }
        }
      }
    });

    if (pagosSinProcesar.length > 0) {
      console.log(`\n⚠️  Se encontraron ${pagosSinProcesar.length} pagos completados con carritos activos:`);
      pagosSinProcesar.forEach(pago => {
        console.log(`   - Pago ${pago.id}: Cliente ${pago.cliente.nombre}, Carrito con ${pago.carrito.items.length} items`);
      });
    } else {
      console.log('\n✅ No hay pagos completados con carritos activos (todos procesados correctamente)');
    }

  } catch (error) {
    console.error('❌ Error durante el debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPaymentFlow();