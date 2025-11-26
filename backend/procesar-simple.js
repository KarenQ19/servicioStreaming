const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function procesarPagosSimple() {
  try {
    console.log('🔄 PROCESANDO PAGOS COMPLETADOS MANUALMENTE\n');

    // Buscar pagos completados
    const pagosCompletados = await prisma.pago.findMany({
      where: {
        estado: 'COMPLETADO'
      },
      include: {
        cliente: true,
        carrito: true,
        metodoPago: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`📊 Se encontraron ${pagosCompletados.length} pagos completados\n`);

    for (const pago of pagosCompletados) {
      console.log(`\n💰 Procesando pago: ${pago.id}`);
      console.log(`   Cliente: ${pago.cliente.nombre}`);
      console.log(`   Monto: $${pago.monto}`);
      console.log(`   Método: ${pago.metodoPago?.tipo || 'N/A'}`);
      console.log(`   Tiene carrito: ${pago.carrito ? 'SÍ' : 'NO'}`);
      
      if (pago.carrito && pago.carrito.length > 0) {
        const carrito = pago.carrito[0]; // Tomar el primer carrito
        console.log(`   Carrito activo: ${carrito.activo}`);
        
        // Ver items del carrito
        const items = await prisma.carritoItem.findMany({
          where: { carritoId: carrito.id },
          include: { servicio: true }
        });
        
        console.log(`   Items en carrito: ${items.length}`);
        
        if (items.length > 0 && carrito.activo) {
          console.log(`   Procesando ${items.length} items...`);
          
          const suscripcionesCreadas = [];
          const credencialesAsignadas = [];
          const fechaInicio = new Date();
          const fechaFin = new Date();
          fechaFin.setMonth(fechaFin.getMonth() + 1);

          // Crear suscripciones para cada item
          for (const item of items) {
            console.log(`   - Procesando ${item.servicio.nombre}...`);
            
            // Verificar si ya existe suscripción
            const existe = await prisma.suscripcion.findFirst({
              where: {
                clienteId: pago.clienteId,
                servicioId: item.servicioId,
                estado: 'ACTIVA'
              }
            });

            if (!existe) {
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
              try {
                const credencialDisponible = await prisma.credenciales.findFirst({
                  where: {
                    servicioId: item.servicioId,
                    asignadas: false,
                    activas: true
                  }
                });

                if (credencialDisponible) {
                  const credencialAsignada = await prisma.credenciales.update({
                    where: { id: credencialDisponible.id },
                    data: {
                      clienteId: pago.clienteId,
                      suscripcionId: suscripcion.id,
                      asignadas: true
                    }
                  });
                  credencialesAsignadas.push(credencialAsignada);
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
                }
              } catch (credError) {
                console.error(`   ❌ Error con credenciales:`, credError.message);
              }
            } else {
              console.log(`   - Suscripción ya existe, saltando...`);
            }
          }

          // Desactivar carrito
          console.log(`   Desactivando carrito...`);
          await prisma.carrito.update({
            where: { id: carrito.id },
            data: { activo: false }
          });

          // Asociar pago a suscripciones
          console.log(`   Asociando pago a suscripciones...`);
          for (const suscripcion of suscripcionesCreadas) {
            await prisma.suscripcion.update({
              where: { id: suscripcion.id },
              data: {
                pagos: {
                  connect: { id: pago.id }
                }
              }
            });
          }

          console.log(`\n✅ Pago procesado!`);
          console.log(`   Suscripciones creadas: ${suscripcionesCreadas.length}`);
          console.log(`   Credenciales asignadas: ${credencialesAsignadas.length}`);
          console.log(`   Carrito desactivado: SÍ`);
          
        } else {
          console.log(`   ❌ No hay items para procesar o carrito ya inactivo`);
        }
      } else {
        console.log(`   ❌ No hay carrito asociado`);
      }
    }

    console.log('\n🎉 Procesamiento completado!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

procesarPagosSimple();