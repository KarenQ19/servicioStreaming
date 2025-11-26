const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function corregirUltimoPago() {
  try {
    console.log('🔧 CORRIGIENDO ÚLTIMO PAGO QR\n');

    // Buscar el pago QR más reciente sin carrito
    const pago = await prisma.pago.findFirst({
      where: {
        estado: 'COMPLETADO'
      },
      include: {
        cliente: true,
        carrito: true,
        metodoPago: true,
        qr: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!pago) {
      console.log('❌ No se encontró ningún pago');
      return;
    }

    console.log(`📋 Pago encontrado: ${pago.id}`);
    console.log(`   Cliente: ${pago.cliente.nombre}`);
    console.log(`   Monto: $${pago.monto}`);
    console.log(`   Método: ${pago.metodoPago?.tipo}`);
    console.log(`   Tiene carrito: ${pago.carrito.length > 0 ? 'SÍ' : 'NO'}`);

    // Si ya tiene carrito, verificar si tiene suscripciones
    if (pago.carrito.length > 0) {
      console.log(`   ✅ El pago ya tiene carrito asociado`);
      
      // Verificar suscripciones
      const suscripciones = await prisma.suscripcion.findMany({
        where: {
          clienteId: pago.clienteId,
          pagos: {
            some: { id: pago.id }
          }
        }
      });

      console.log(`   Suscripciones: ${suscripciones.length}`);
      
      if (suscripciones.length === 0) {
        console.log(`   ⚠️  El pago tiene carrito pero no tiene suscripciones`);
        
        // Procesar el carrito
        const carrito = pago.carrito[0];
        const items = await prisma.carritoItem.findMany({
          where: { carritoId: carrito.id },
          include: { servicio: true }
        });

        console.log(`   Items en carrito: ${items.length}`);
        
        if (items.length > 0) {
          console.log(`   Procesando items...`);
          
          const suscripcionesCreadas = [];
          const credencialesAsignadas = [];
          const fechaInicio = new Date();
          const fechaFin = new Date();
          fechaFin.setMonth(fechaFin.getMonth() + 1);

          for (const item of items) {
            console.log(`   📦 Procesando: ${item.servicio.nombre}`);
            
            // Crear suscripción
            const suscripcion = await prisma.suscripcion.create({
              data: {
                clienteId: pago.clienteId,
                servicioId: item.servicioId,
                estado: 'ACTIVA',
                fechaInicio,
                fechaFin
              }
            });

            suscripcionesCreadas.push(suscripcion);

            // Asignar credenciales
            const credencialDisponible = await prisma.credenciales.findFirst({
              where: {
                servicioId: item.servicioId,
                asignadas: false,
                activas: true
              }
            });

            if (credencialDisponible) {
              await prisma.credenciales.update({
                where: { id: credencialDisponible.id },
                data: {
                  clienteId: pago.clienteId,
                  suscripcionId: suscripcion.id,
                  asignadas: true
                }
              });
              credencialesAsignadas.push(credencialDisponible);
              console.log(`   ✅ Credencial asignada: ${credencialDisponible.usuario}`);
            } else {
              // Crear credencial genérica
              const credencial = await prisma.credenciales.create({
                data: {
                  clienteId: pago.clienteId,
                  servicioId: item.servicioId,
                  suscripcionId: suscripcion.id,
                  usuario: `user_${pago.clienteId.slice(-6)}_${item.servicioId.slice(-4)}`,
                  password: `pass_${Math.random().toString(36).slice(-8)}`,
                  activas: true,
                  asignadas: true
                }
              });
              credencialesAsignadas.push(credencial);
              console.log(`   ✅ Credencial creada: ${credencial.usuario}`);
            }

            // Asociar pago a suscripción
            await prisma.suscripcion.update({
              where: { id: suscripcion.id },
              data: {
                pagos: {
                  connect: { id: pago.id }
                }
              }
            });
          }

          // Desactivar carrito
          if (carrito.activo) {
            await prisma.carrito.update({
              where: { id: carrito.id },
              data: { activo: false }
            });
            console.log(`   🗑️  Carrito desactivado`);
          }

          console.log(`\n🎉 Procesamiento completado!`);
          console.log(`   Suscripciones creadas: ${suscripcionesCreadas.length}`);
          console.log(`   Credenciales asignadas: ${credencialesAsignadas.length}`);
        } else {
          console.log(`   ❌ No hay items en el carrito`);
        }
      }
    } else {
      console.log(`   ❌ El pago no tiene carrito asociado`);
      
      // Buscar carritos activos del cliente
      const carritos = await prisma.carrito.findMany({
        where: {
          clienteId: pago.clienteId,
          activo: true
        },
        include: {
          items: {
            include: { servicio: true }
          }
        }
      });

      const carritosUtiles = carritos.filter(c => c.items.length > 0);
      console.log(`   Carritos útiles encontrados: ${carritosUtiles.length}`);

      if (carritosUtiles.length > 0) {
        const carrito = carritosUtiles[0];
        console.log(`   Usando carrito: ${carrito.id} con ${carrito.items.length} items`);
        
        // Asociar carrito al pago
        await prisma.pago.update({
          where: { id: pago.id },
          data: {
            carrito: {
              connect: { id: carrito.id }
            }
          }
        });
        
        console.log(`   ✅ Carrito asociado al pago`);
        
        // Ahora procesar el carrito
        console.log(`   Procesando carrito...`);
        
        const suscripcionesCreadas = [];
        const credencialesAsignadas = [];
        const fechaInicio = new Date();
        const fechaFin = new Date();
        fechaFin.setMonth(fechaFin.getMonth() + 1);

        for (const item of carrito.items) {
          console.log(`   📦 Procesando: ${item.servicio.nombre}`);
          
          // Crear suscripción
          const suscripcion = await prisma.suscripcion.create({
            data: {
              clienteId: pago.clienteId,
              servicioId: item.servicioId,
              estado: 'ACTIVA',
              fechaInicio,
              fechaFin
            }
          });

          suscripcionesCreadas.push(suscripcion);

          // Asignar credenciales
          const credencialDisponible = await prisma.credenciales.findFirst({
            where: {
              servicioId: item.servicioId,
              asignadas: false,
              activas: true
            }
          });

          if (credencialDisponible) {
            await prisma.credenciales.update({
              where: { id: credencialDisponible.id },
              data: {
                clienteId: pago.clienteId,
                suscripcionId: suscripcion.id,
                asignadas: true
              }
            });
            credencialesAsignadas.push(credencialDisponible);
            console.log(`   ✅ Credencial asignada: ${credencialDisponible.usuario}`);
          } else {
            // Crear credencial genérica
            const credencial = await prisma.credenciales.create({
              data: {
                clienteId: pago.clienteId,
                servicioId: item.servicioId,
                suscripcionId: suscripcion.id,
                usuario: `user_${pago.clienteId.slice(-6)}_${item.servicioId.slice(-4)}`,
                password: `pass_${Math.random().toString(36).slice(-8)}`,
                activas: true,
                asignadas: true
              }
            });
            credencialesAsignadas.push(credencial);
            console.log(`   ✅ Credencial creada: ${credencial.usuario}`);
          }

          // Asociar pago a suscripción
          await prisma.suscripcion.update({
            where: { id: suscripcion.id },
            data: {
              pagos: {
                connect: { id: pago.id }
              }
            }
          });
        }

        // Desactivar carrito
        await prisma.carrito.update({
          where: { id: carrito.id },
          data: { activo: false }
        });
        console.log(`   🗑️  Carrito desactivado`);

        console.log(`\n🎉 Procesamiento completado!`);
        console.log(`   Suscripciones creadas: ${suscripcionesCreadas.length}`);
        console.log(`   Credenciales asignadas: ${credencialesAsignadas.length}`);
      } else {
        console.log(`   ❌ No hay carritos útiles disponibles`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

corregirUltimoPago();