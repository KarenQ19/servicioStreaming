const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function procesarPagosQR() {
  try {
    console.log('🔄 PROCESANDO PAGOS QR NO PROCESADOS\n');

    // Buscar pagos QR completados
    const pagos = await prisma.pago.findMany({
      where: {
        estado: 'COMPLETADO',
        createdAt: {
          gte: new Date(Date.now() - 48 * 60 * 60 * 1000)
        }
      },
      include: {
        cliente: true,
        carrito: true,
        metodoPago: true,
        qr: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const pagosQR = pagos.filter(p => p.metodoPago?.tipo === 'QR');
    console.log(`📊 Pagos QR encontrados: ${pagosQR.length}\n`);

    for (const pago of pagosQR) {
      console.log(`💰 Pago: ${pago.id} - $${pago.monto} - Cliente: ${pago.cliente.nombre}`);
      
      // Verificar si ya tiene suscripciones
      const suscripciones = await prisma.suscripcion.findMany({
        where: {
          clienteId: pago.clienteId,
          pagos: {
            some: { id: pago.id }
          }
        }
      });

      if (suscripciones.length > 0) {
        console.log(`   ✅ Ya tiene ${suscripciones.length} suscripciones`);
        continue;
      }

      console.log(`   ⚠️  No tiene suscripciones, procesando...`);

      // Si no hay carrito, crear uno temporal
      let carrito = pago.carrito.length > 0 ? pago.carrito[0] : null;
      let items = [];

      if (!carrito) {
        console.log(`   Creando carrito temporal...`);
        carrito = await prisma.carrito.create({
          data: {
            clienteId: pago.clienteId,
            activo: true
          }
        });

        // Buscar servicios que coincidan con el monto
        const servicios = await prisma.servicio.findMany({
          where: { disponible: true }
        });

        let montoRestante = pago.monto;
        for (const servicio of servicios) {
          if (montoRestante >= servicio.precio) {
            const item = await prisma.carritoItem.create({
              data: {
                carritoId: carrito.id,
                servicioId: servicio.id,
                cantidad: 1,
                precio: servicio.precio
              }
            });
            items.push(item);
            montoRestante -= servicio.precio;
            if (montoRestante < 1) break;
          }
        }

        // Asociar carrito al pago
        await prisma.pago.update({
          where: { id: pago.id },
          data: {
            carrito: {
              connect: { id: carrito.id }
            }
          }
        });

        console.log(`   ✅ Carrito creado con ${items.length} items`);
      } else {
        // Obtener items del carrito existente
        items = await prisma.carritoItem.findMany({
          where: { carritoId: carrito.id },
          include: { servicio: true }
        });
        console.log(`   Carrito tiene ${items.length} items`);
      }

      if (items.length === 0) {
        console.log(`   ❌ No hay items para procesar`);
        continue;
      }

      // Procesar items
      const suscripcionesCreadas = [];
      const credencialesAsignadas = [];
      const fechaInicio = new Date();
      const fechaFin = new Date();
      fechaFin.setMonth(fechaFin.getMonth() + 1);

      for (const item of items) {
        console.log(`   - Procesando ${item.servicio?.nombre || 'Servicio desconocido'}...`);
        
        // Verificar si ya existe suscripción activa
        const existe = await prisma.suscripcion.findFirst({
          where: {
            clienteId: pago.clienteId,
            servicioId: item.servicioId,
            estado: 'ACTIVA'
          }
        });

        if (existe) {
          console.log(`     Suscripción ya existe`);
          continue;
        }

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
            await prisma.credenciales.update({
              where: { id: credencialDisponible.id },
              data: {
                clienteId: pago.clienteId,
                suscripcionId: suscripcion.id,
                asignadas: true
              }
            });
            credencialesAsignadas.push(credencialDisponible);
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
        } catch (error) {
          console.error(`     Error con credenciales:`, error.message);
        }
      }

      // Desactivar carrito
      if (carrito.activo) {
        console.log(`   Desactivando carrito...`);
        await prisma.carrito.update({
          where: { id: carrito.id },
          data: { activo: false }
        });
      }

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

      console.log(`   ✅ Completado: ${suscripcionesCreadas.length} suscripciones, ${credencialesAsignadas.length} credenciales`);
      console.log('');
    }

    console.log('🎉 Procesamiento finalizado!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

procesarPagosQR();