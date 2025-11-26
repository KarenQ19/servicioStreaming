const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function procesarPagosPendientes() {
  try {
    console.log('🔄 PROCESANDO PAGOS COMPLETADOS NO PROCESADOS\n');

    // Buscar pagos completados con QR usado pero sin procesar
    const pagosCompletados = await prisma.pago.findMany({
      where: {
        estado: 'COMPLETADO',
        metodoPago: {
          tipo: 'QR'
        },
        createdAt: {
          gte: new Date(Date.now() - 48 * 60 * 60 * 1000) // Últimas 48 horas
        }
      },
      include: {
        cliente: true,
        carrito: true,
        metodoPago: true,
        qr: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Pagos QR completados encontrados: ${pagosCompletados.length}\n`);

    let procesados = 0;
    let errores = 0;

    for (const pago of pagosCompletados) {
      console.log(`\n💰 Procesando pago: ${pago.id}`);
      console.log(`   Cliente: ${pago.cliente.nombre}`);
      console.log(`   Monto: $${pago.monto}`);
      console.log(`   Estado: ${pago.estado}`);
      console.log(`   Estado QR: ${pago.qr && pago.qr.length > 0 ? pago.qr[0].estado : pago.qr ? pago.qr.estado : 'N/A'}`);
      console.log(`   Tiene Carrito: ${pago.carrito && pago.carrito.length > 0 ? 'SÍ' : 'NO'}`);

      // Verificar si ya tiene suscripciones creadas
      const suscripcionesExistentes = await prisma.suscripcion.findMany({
        where: {
          clienteId: pago.clienteId,
          pagos: {
            some: { id: pago.id }
          }
        }
      });

      if (suscripcionesExistentes.length > 0) {
        console.log(`   ✅ Ya tiene ${suscripcionesExistentes.length} suscripciones, saltando...`);
        continue;
      }

      // Si no hay carrito, crear uno temporal
      if (!pago.carrito || pago.carrito.length === 0) {
        console.log(`   ⚠️  No hay carrito asociado, creando carrito temporal...`);
        
        // Crear carrito temporal
        const carritoTemporal = await prisma.carrito.create({
          data: {
            clienteId: pago.clienteId,
            activo: true
          }
        });

        // Buscar servicios que coincidan con el monto
        const servicios = await prisma.servicio.findMany({
          where: { disponible: true },
          orderBy: { precio: 'desc' }
        });

        // Intentar crear items que sumen el monto
        let montoRestante = pago.monto;
        const itemsCreados = [];

        for (const servicio of servicios) {
          if (montoRestante >= servicio.precio) {
            const item = await prisma.carritoItem.create({
              data: {
                carritoId: carritoTemporal.id,
                servicioId: servicio.id,
                cantidad: 1,
                precio: servicio.precio
              }
            });
            itemsCreados.push(item);
            montoRestante -= servicio.precio;
            
            if (montoRestante < 1) break;
          }
        }

        console.log(`   ✅ Carrito temporal creado con ${itemsCreados.length} items`);
        
        // Asociar el carrito al pago
        await prisma.pago.update({
          where: { id: pago.id },
          data: {
            carrito: {
              connect: { id: carritoTemporal.id }
            }
          }
        });

        // Procesar con el carrito temporal
        await procesarPagoConCarrito(pago, carritoTemporal, itemsCreados);
        procesados++;
      } else {
        // Procesar con el carrito existente
        const carrito = pago.carrito[0];
        
        // Ver items del carrito
        const items = await prisma.carritoItem.findMany({
          where: { carritoId: carrito.id },
          include: { servicio: true }
        });

        console.log(`   Items en carrito: ${items.length}`);
        
        if (items.length === 0) {
          console.log(`   ❌ No hay items en el carrito`);
          errores++;
          continue;
        }

        await procesarPagoConCarrito(pago, carrito, items);
        procesados++;
      }
    }

    console.log(`\n🎉 Procesamiento completado!`);
    console.log(`   Procesados: ${procesados}`);
    console.log(`   Errores: ${errores}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function procesarPagoConCarrito(pago, carrito, items) {
  const suscripcionesCreadas = [];
  const credencialesAsignadas = [];
  const fechaInicio = new Date();
  const fechaFin = new Date();
  fechaFin.setMonth(fechaFin.getMonth() + 1);

  console.log(`   Procesando ${items.length} items...`);

  // Crear suscripciones para cada item del carrito
  for (const item of items) {
    console.log(`   - Procesando ${item.servicio.nombre}...`);
    
    // Verificar si ya existe una suscripción activa para este servicio
    const suscripcionExistente = await prisma.suscripcion.findFirst({
      where: {
        clienteId: pago.clienteId,
        servicioId: item.servicioId,
        estado: 'ACTIVA'
      }
    });

    if (suscripcionExistente) {
      console.log(`     Suscripción ya existe, saltando...`);
      continue;
    }

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
      console.log(`     Buscando credenciales disponibles...`);
      
      const credencialDisponible = await prisma.credenciales.findFirst({
        where: {
          servicioId: item.servicioId,
          asignadas: false,
          activas: true
        }
      });

      if (credencialDisponible) {
        console.log(`     Asignando credencial existente...`);
        
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
        console.log(`     No hay credenciales disponibles, creando genérica...`);
        
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
      console.error(`     ❌ Error con credenciales:`, credError.message);
    }
  }

  // Desactivar el carrito
  if (carrito.activo) {
    console.log(`   Desactivando carrito...`);
    await prisma.carrito.update({
      where: { id: carrito.id },
      data: { activo: false }
    });
  }

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

  console.log(`   ✅ Procesamiento completado:`);
  console.log(`      - Suscripciones creadas: ${suscripcionesCreadas.length}`);
  console.log(`      - Credenciales asignadas: ${credencialesAsignadas.length}`);
  console.log(`      - Carrito desactivado: SÍ`);
}

procesarPagosPendientes();