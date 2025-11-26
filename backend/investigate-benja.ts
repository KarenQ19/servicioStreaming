import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function investigateBenjaUser() {
  try {
    console.log('🔍 Investigando el estado del usuario benja@gmail.com...\n');

    // Buscar el usuario
    const usuario = await prisma.cliente.findFirst({
      where: {
        email: 'benja@gmail.com'
      }
    });

    if (!usuario) {
      console.log('❌ No se encontró el usuario benja@gmail.com');
      return;
    }

    console.log(`✅ Usuario encontrado: ${usuario.email} (ID: ${usuario.id})\n`);

    // Verificar pagos
    console.log('💳 PAGOS:');
    const pagos = await prisma.pago.findMany({
      where: {
        clienteId: usuario.id
      },
      include: {
        carrito: {
          include: {
            items: {
              include: {
                servicio: true
              }
            }
          }
        },
        metodoPago: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`   📊 Total de pagos: ${pagos.length}`);
    pagos.forEach((pago, index) => {
      console.log(`   ${index + 1}. Pago ID: ${pago.id}`);
      console.log(`      - Estado: ${pago.estado}`);
      console.log(`      - Monto: $${pago.monto}`);
      console.log(`      - Fecha: ${pago.createdAt.toISOString()}`);
      console.log(`      - Carrito ID: ${pago.carritoId}`);
      console.log(`      - Carrito activo: ${pago.carrito?.activo || 'N/A'}`);
      if (pago.carrito?.items) {
        console.log(`      - Items en carrito: ${pago.carrito.items.length}`);
        pago.carrito.items.forEach((item: any) => {
          console.log(`        * ${item.servicio.nombre}: ${item.cantidad}x $${item.precio}`);
        });
      }
      console.log('');
    });

    // Verificar carritos activos
    console.log('🛒 CARRITOS ACTIVOS:');
    const carritosActivos = await prisma.carrito.findMany({
      where: {
        clienteId: usuario.id,
        activo: true
      },
      include: {
        items: {
          include: {
            servicio: true
          }
        }
      }
    });

    console.log(`   📊 Carritos activos: ${carritosActivos.length}`);
    carritosActivos.forEach((carrito, index) => {
      console.log(`   ${index + 1}. Carrito ID: ${carrito.id}`);
      console.log(`      - Items: ${carrito.items.length}`);
      carrito.items.forEach((item: any) => {
        console.log(`        * ${item.servicio.nombre}: ${item.cantidad}x $${item.precio}`);
      });
      console.log('');
    });

    // Verificar suscripciones
    console.log('🎯 SUSCRIPCIONES:');
    const suscripciones = await prisma.suscripcion.findMany({
      where: {
        clienteId: usuario.id
      },
      include: {
        servicio: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`   📊 Total de suscripciones: ${suscripciones.length}`);
    suscripciones.forEach((sub, index) => {
      console.log(`   ${index + 1}. Suscripción ID: ${sub.id}`);
      console.log(`      - Servicio: ${sub.servicio.nombre}`);
      console.log(`      - Estado: ${sub.estado}`);
      console.log(`      - Fecha inicio: ${sub.fechaInicio.toISOString()}`);
      console.log(`      - Fecha fin: ${sub.fechaFin?.toISOString() || 'N/A'}`);
      console.log('');
    });

    // Verificar credenciales
    console.log('🔑 CREDENCIALES:');
    const credenciales = await prisma.credenciales.findMany({
      where: {
        clienteId: usuario.id
      },
      include: {
        servicio: true,
        suscripcion: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`   📊 Total de credenciales: ${credenciales.length}`);
    credenciales.forEach((cred: any, index) => {
      console.log(`   ${index + 1}. Credencial ID: ${cred.id}`);
      console.log(`      - Servicio: ${cred.servicio.nombre}`);
      console.log(`      - Usuario: ${cred.usuario}`);
      console.log(`      - Contraseña: ${cred.password || 'N/A'}`);
      console.log(`      - Asignadas: ${cred.asignadas}`);
      console.log(`      - Suscripción ID: ${cred.suscripcionId || 'N/A'}`);
      console.log('');
    });

    // Buscar pagos completados con carritos activos (no procesados)
    console.log('⚠️  PAGOS COMPLETADOS NO PROCESADOS:');
    const pagosNoProcessados = await prisma.pago.findMany({
      where: {
        clienteId: usuario.id,
        estado: 'COMPLETADO',
        carrito: {
          activo: true
        }
      },
      include: {
        carrito: {
          include: {
            items: {
              include: {
                servicio: true
              }
            }
          }
        }
      }
    });

    console.log(`   📊 Pagos completados no procesados: ${pagosNoProcessados.length}`);
    pagosNoProcessados.forEach((pago, index) => {
      console.log(`   ${index + 1}. Pago ID: ${pago.id}`);
      console.log(`      - Monto: $${pago.monto}`);
      console.log(`      - Fecha: ${pago.createdAt.toISOString()}`);
      console.log(`      - Items en carrito: ${pago.carrito?.items.length || 0}`);
      if (pago.carrito?.items) {
        pago.carrito.items.forEach((item: any) => {
          console.log(`        * ${item.servicio.nombre}: ${item.cantidad}x $${item.precio}`);
        });
      }
      console.log('');
    });

    console.log('✅ Investigación completada!');

  } catch (error) {
    console.error('❌ Error en la investigación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigateBenjaUser();