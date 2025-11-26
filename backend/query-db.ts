import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function queryUserData() {
  try {
    console.log('🔍 Consultando datos del cliente usu@gmail.com...\n');
    
    // Buscar el cliente
    const cliente = await prisma.cliente.findUnique({
      where: { email: 'usu@gmail.com' },
      include: {
        pagos: {
          include: {
            metodoPago: {
              select: {
                id: true,
                nombre: true,
                tipo: true
              }
            },
            carrito: {
              include: {
                items: {
                  include: {
                    servicio: {
                      select: {
                        id: true,
                        nombre: true,
                        precio: true
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        carritos: {
          include: {
            items: {
              include: {
                servicio: {
                  select: {
                    id: true,
                    nombre: true,
                    precio: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        credenciales: {
          include: {
            servicio: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        },
        suscripciones: {
          include: {
            servicio: {
              select: {
                id: true,
                nombre: true,
                precio: true
              }
            }
          }
        }
      }
    });

    if (!cliente) {
      console.log('❌ Cliente no encontrado');
      return;
    }

    console.log('👤 CLIENTE ENCONTRADO:');
    console.log(`   ID: ${cliente.id}`);
    console.log(`   Nombre: ${cliente.nombre}`);
    console.log(`   Email: ${cliente.email}`);
    console.log(`   Fecha registro: ${cliente.createdAt}`);

    console.log('\n💳 PAGOS:');
    cliente.pagos.forEach((pago, index) => {
      console.log(`   ${index + 1}. ID: ${pago.id}`);
      console.log(`      Estado: ${pago.estado}`);
      console.log(`      Monto: $${pago.monto}`);
      console.log(`      Método: ${pago.metodoPago.nombre}`);
      console.log(`      Fecha: ${pago.createdAt}`);
      console.log(`      Carrito ID: ${pago.carritoId}`);
      if (pago.carrito && pago.carrito.items.length > 0) {
        console.log(`      Items del carrito:`);
        pago.carrito.items.forEach(item => {
          console.log(`        - ${item.servicio.nombre} (x${item.cantidad}) - $${item.servicio.precio}`);
        });
      }
      console.log('');
    });

    console.log('\n🛒 CARRITOS:');
    cliente.carritos.forEach((carrito, index) => {
      console.log(`   ${index + 1}. ID: ${carrito.id}`);
      console.log(`      Activo: ${carrito.activo}`);
      console.log(`      Items: ${carrito.items.length}`);
      console.log(`      Fecha: ${carrito.createdAt}`);
      if (carrito.items.length > 0) {
        console.log(`      Contenido:`);
        carrito.items.forEach(item => {
          console.log(`        - ${item.servicio.nombre} (x${item.cantidad}) - $${item.servicio.precio}`);
        });
      }
      console.log('');
    });

    console.log('\n🔑 CREDENCIALES:');
    cliente.credenciales.forEach((cred, index) => {
      console.log(`   ${index + 1}. ID: ${cred.id}`);
      console.log(`      Servicio: ${cred.servicio.nombre}`);
      console.log(`      Usuario: ${cred.usuario}`);
      console.log(`      Password: ${cred.password}`);
      console.log(`      Activas: ${cred.activas}`);
      console.log(`      Asignadas: ${cred.asignadas}`);
      console.log('');
    });

    console.log('\n📺 SUSCRIPCIONES:');
    cliente.suscripciones.forEach((subs, index) => {
      console.log(`   ${index + 1}. ID: ${subs.id}`);
      console.log(`      Servicio: ${subs.servicio.nombre}`);
      console.log(`      Estado: ${subs.estado}`);
      console.log(`      Inicio: ${subs.fechaInicio}`);
      console.log(`      Fin: ${subs.fechaFin}`);
      console.log('');
    });

    // Buscar un pago PENDIENTE para probar
    const pagoPendiente = cliente.pagos.find(p => p.estado === 'PENDIENTE');
    if (pagoPendiente) {
      console.log(`\n🎯 PAGO PENDIENTE ENCONTRADO PARA PRUEBA:`);
      console.log(`   ID: ${pagoPendiente.id}`);
      console.log(`   Estado: ${pagoPendiente.estado}`);
      console.log(`   Monto: $${pagoPendiente.monto}`);
    } else {
      console.log(`\n⚠️  No se encontraron pagos PENDIENTES para probar`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

queryUserData();