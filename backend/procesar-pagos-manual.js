const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function procesarPagosCompletadosManual() {
  try {
    console.log('🔄 PROCESANDO PAGOS COMPLETADOS MANUALMENTE\n');

    // Buscar pagos completados con carritos activos (no procesados)
    const pagosNoProcesados = await prisma.pago.findMany({
      where: {
        estado: 'COMPLETADO'
      },
      include: {
        carrito: {
          where: {
            activo: true
          },
          include: {
            items: {
              include: {
                servicio: true
              }
            }
          }
        },
        cliente: true
      }
    });
    
    // Filtrar solo los que tienen carritos activos
    const pagosConCarritoActivo = pagosNoProcesados.filter(pago => pago.carrito.length > 0);

    console.log(`📊 Se encontraron ${pagosConCarritoActivo.length} pagos completados con carritos activos\n`);

    if (pagosConCarritoActivo.length === 0) {
      console.log('✅ No hay pagos para procesar');
      return;
    }

    // Procesar cada pago
    for (const pago of pagosConCarritoActivo) {
      console.log(`\n💰 Procesando pago: ${pago.id}`);
      console.log(`   Cliente: ${pago.cliente.nombre}`);
      console.log(`   Monto: $${pago.monto}`);
      console.log(`   Carritos: ${pago.carrito.length}`);
      
      if (pago.carrito.length > 0) {
        const carrito = pago.carrito[0]; // Tomar el primer carrito
        console.log(`   Items en carrito: ${carrito.items.length}`);
        
        const suscripcionesCreadas = [];
        const credencialesAsignadas = [];
        const fechaInicio = new Date();
        const fechaFin = new Date();
        fechaFin.setMonth(fechaFin.getMonth() + 1);

        // Crear suscripciones para cada item del carrito
        for (const item of carrito.items) {
          console.log(`   Procesando item: ${item.servicio.nombre}`);
          
          // Verificar si ya existe una suscripción activa para este servicio
          const suscripcionExistente = await prisma.suscripcion.findFirst({
            where: {
              clienteId: pago.clienteId,
              servicioId: item.servicioId,
              estado: 'ACTIVA'
            }
          });

          if (!suscripcionExistente) {
            console.log(`   Creando suscripción para ${item.servicio.nombre}...`);
            
            // Crear nueva suscripción
            const suscripcion = await prisma.suscripcion.create({
              data: {
                clienteId: pago.clienteId,
                servicioId: item.servicioId,
                estado: 'ACTIVA',
                fechaInicio,
                fechaFin
              },
              include: {
                servicio: {
                  select: {
                    id: true,
                    nombre: true,
                    descripcion: true,
                    precio: true,
                    categoria: true
                  }
                }
              }
            });

            suscripcionesCreadas.push(suscripcion);

            // Asignar credenciales
            try {
              console.log(`   Buscando credenciales disponibles para ${item.servicio.nombre}...`);
              
              // Buscar una credencial disponible
              const credencialDisponible = await prisma.credenciales.findFirst({
                where: {
                  servicioId: item.servicioId,
                  asignadas: false,
                  activas: true
                }
              });

              if (credencialDisponible) {
                console.log(`   Asignando credencial existente...`);
                
                // Asignar la credencial
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
                console.log(`   No hay credenciales disponibles, creando genérica...`);
                
                // Crear credenciales genéricas como fallback
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
              console.error(`   ❌ Error al asignar credenciales:`, credError.message);
            }
          } else {
            console.log(`   Suscripción ya existe para ${item.servicio.nombre}, saltando...`);
          }
        }

        // Desactivar el carrito
        console.log(`   Desactivando carrito...`);
        await prisma.carrito.update({
          where: { id: carrito.id },
          data: { activo: false }
        });

        // Asociar el pago a las suscripciones creadas
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

        console.log(`\n✅ Pago procesado exitosamente!`);
        console.log(`   Suscripciones creadas: ${suscripcionesCreadas.length}`);
        console.log(`   Credenciales asignadas: ${credencialesAsignadas.length}`);
        console.log(`   Carrito desactivado: SÍ`);

      } else {
        console.log(`   ❌ El pago no tiene carrito asociado`);
      }
    }

    console.log('\n🎉 Procesamiento manual completado!');

  } catch (error) {
    console.error('❌ Error durante el procesamiento:', error);
  } finally {
    await prisma.$disconnect();
  }
}

procesarPagosCompletadosManual();