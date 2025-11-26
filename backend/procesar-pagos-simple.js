const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function procesarPagosSimple() {
  try {
    console.log('🔄 PROCESANDO PAGOS COMPLETADOS NO PROCESADOS\n');

    // Buscar pagos completados con QR
    const pagosCompletados = await prisma.pago.findMany({
      where: {
        estado: 'COMPLETADO',
        metodoPago: {
          tipo: 'QR'
        },
        createdAt: {
          gte: new Date(Date.now() - 48 * 60 * 60 * 1000)
        }
      },
      include: {
        cliente: true,
        carrito: true,
        metodoPago: true,
        _count: {
          select: {
            suscripcion: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`📊 Pagos QR completados encontrados: ${pagosCompletados.length}\n`);

    for (const pago of pagosCompletados) {
      console.log(`💰 Pago: ${pago.id}`);
      console.log(`   Cliente: ${pago.cliente.nombre}`);
      console.log(`   Monto: $${pago.monto}`);
      console.log(`   Suscripciones: ${pago._count.suscripcion}`);
      console.log(`   Tiene Carrito: ${pago.carrito.length > 0 ? 'SÍ' : 'NO'}`);

      if (pago._count.suscripcion > 0) {
        console.log(`   ✅ Ya tiene suscripciones, saltando...`);
        continue;
      }

      if (pago.carrito.length === 0) {
        console.log(`   ⚠️  No hay carrito, creando uno temporal...`);
        
        // Crear carrito temporal
        const carrito = await prisma.carrito.create({
          data: {
            clienteId: pago.clienteId,
            activo: true
          }
        });

        // Buscar servicios que coincidan con el monto
        const servicios = await prisma.servicio.findMany({
          where: { disponible: true }
        });

        // Crear items que sumen el monto
        let montoRestante = pago.monto;
        const items = [];

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

        console.log(`   ✅ Carrito creado con ${items.length} items`);
        
        // Asociar carrito al pago
        await prisma.pago.update({
          where: { id: pago.id },
          data: {
            carrito: {
              connect: { id: carrito.id }
            }
          }
        });

        // Procesar con el carrito temporal
        await procesarCarrito(pago, carrito, items);
      } else {
        // Procesar con carrito existente
        const carrito = pago.carrito[0];
        
        // Ver items
        const items = await prisma.carritoItem.findMany({
          where: { carritoId: carrito.id },
          include: { servicio: true }
        });

        console.log(`   Items en carrito: ${items.length}`);
        
        if (items.length === 0) {
          console.log(`   ❌ No hay items en el carrito`);
          continue;
        }

        await procesarCarrito(pago, carrito, items);
      }
    }

    console.log('\n🎉 Procesamiento completado!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function procesarCarrito(pago, carrito, items) {
  console.log(`   Procesando ${items.length} items...`);
  
  const suscripcionesCreadas = [];
  const credencialesAsignadas = [];
  const fechaInicio = new Date();
  const fechaFin = new Date();
  fechaFin.setMonth(fechaFin.getMonth() + 1);

  for (const item of items) {
    console.log(`   - ${item.servicio.nombre}...`);
    
    // Verificar si ya existe suscripción
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
        // Asignar credencial existente
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
}

procesarPagosSimple();