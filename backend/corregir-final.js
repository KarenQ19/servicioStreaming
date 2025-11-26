const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function corregirPagosQR() {
  try {
    console.log('🔧 CORRIGIENDO PAGOS QR SIN PROCESAR\n');

    // Buscar pagos QR completados recientes
    const pagos = await prisma.pago.findMany({
      where: {
        estado: 'COMPLETADO',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
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

    const pagosQR = pagos.filter(p => p.metodoPago?.tipo === 'QR');
    console.log(`📊 Pagos QR encontrados: ${pagosQR.length}`);

    for (const pago of pagosQR) {
      console.log(`\n💰 Procesando pago: ${pago.id}`);
      console.log(`   Cliente: ${pago.cliente.nombre}`);
      console.log(`   Monto: $${pago.monto}`);
      console.log(`   Tiene carrito: ${pago.carrito.length > 0 ? 'SÍ' : 'NO'}`);

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

      let carrito = null;
      let items = [];

      if (pago.carrito.length === 0) {
        console.log(`   Buscando carritos activos del cliente...`);
        
        // Buscar carritos activos del cliente
        const carritosCliente = await prisma.carrito.findMany({
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

        const carritosUtiles = carritosCliente.filter(c => c.items.length > 0);
        console.log(`   Carritos útiles encontrados: ${carritosUtiles.length}`);

        if (carritosUtiles.length > 0) {
          carrito = carritosUtiles[0];
          items = carrito.items;
          console.log(`   Usando carrito: ${carrito.id} con ${items.length} items`);
        } else {
          console.log(`   Creando carrito temporal...`);
          carrito = await prisma.carrito.create({
            data: {
              clienteId: pago.clienteId,
              activo: true
            }
          });

          // Crear items basados en el monto
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
          console.log(`   ✅ Carrito creado con ${items.length} items y asociado al pago`);
        }
      } else {
        carrito = pago.carrito[0];
        items = await prisma.carritoItem.findMany({
          where: { carritoId: carrito.id },
          include: { servicio: true }
        });
        console.log(`   Carrito existente con ${items.length} items`);
      }

      if (items.length === 0) {
        console.log(`   ❌ No hay items para procesar`);
        continue;
      }

      // Procesar items
      console.log(`   ⚙️  Procesando ${items.length} items...`);
      
      const suscripcionesCreadas = [];
      const credencialesAsignadas = [];
      const fechaInicio = new Date();
      const fechaFin = new Date();
      fechaFin.setMonth(fechaFin.getMonth() + 1);

      for (const item of items) {
        console.log(`   📦 ${item.servicio.nombre}`);
        
        // Verificar si ya existe suscripción
        const existe = await prisma.suscripcion.findFirst({
          where: {
            clienteId: pago.clienteId,
            servicioId: item.servicioId,
            estado: 'ACTIVA'
          }
        });

        if (existe) {
          console.log(`   ⚠️  Suscripción ya existe`);
          continue;
        }

        // Crear suscripción
        console.log(`   ✅ Creando suscripción...`);
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
        console.log(`   🔑 Buscando credenciales...`);
        const credencialDisponible = await prisma.credenciales.findFirst({
          where: {
            servicioId: item.servicioId,
            asignadas: false,
            activas: true
          }
        });

        if (credencialDisponible) {
          console.log(`   ✅ Asignando credencial existente`);
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
          console.log(`   ⚠️  Creando credencial genérica`);
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
      }

      // Desactivar carrito
      if (carrito.activo) {
        console.log(`   🗑️  Desactivando carrito...`);
        await prisma.carrito.update({
          where: { id: carrito.id },
          data: { activo: false }
        });
      }

      // Asociar pago a suscripciones
      console.log(`   🔗 Asociando pago a suscripciones...`);
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

      console.log(`   🎉 Completado: ${suscripcionesCreadas.length} suscripciones, ${credencialesAsignadas.length} credenciales`);
    }

    console.log('\n✅ Corrección finalizada!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

corregirPagosQR();