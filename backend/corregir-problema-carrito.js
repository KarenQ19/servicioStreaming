const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function corregirProblemaCarrito() {
  try {
    console.log('🔧 CORRIGIENDO PROBLEMA DEL CARRITO EN PAGOS QR\n');

    // 1. Encontrar el pago QR más reciente sin carrito
    const pagoSinCarrito = await prisma.pago.findFirst({
      where: {
        estado: 'COMPLETADO',
        metodoPago: {
          tipo: 'QR'
        },
        carrito: {
          none: {} // No tiene carritos asociados
        }
      },
      include: {
        cliente: true,
        qr: true,
        metodoPago: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!pagoSinCarrito) {
      console.log('✅ No se encontraron pagos QR sin carrito asociado');
      return;
    }

    console.log(`📋 Pago encontrado: ${pagoSinCarrito.id}`);
    console.log(`   Cliente: ${pagoSinCarrito.cliente.nombre}`);
    console.log(`   Monto: $${pagoSinCarrito.monto}`);
    console.log(`   Estado: ${pagoSinCarrito.estado}`);
    console.log(`   Tiene QR: ${pagoSinCarrito.qr.length > 0 ? 'SÍ' : 'NO'}`);

    // 2. Buscar carritos activos del cliente con items
    const carritosActivos = await prisma.carrito.findMany({
      where: {
        clienteId: pagoSinCarrito.clienteId,
        activo: true,
        items: {
          some: {} // Tiene items
        }
      },
      include: {
        items: {
          include: { servicio: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`\n🛒 Carritos activos con items encontrados: ${carritosActivos.length}`);

    if (carritosActivos.length === 0) {
      console.log('❌ No hay carritos activos con items para este cliente');
      return;
    }

    // 3. Usar el primer carrito activo
    const carritoParaUsar = carritosActivos[0];
    console.log(`\n✅ Usando carrito: ${carritoParaUsar.id}`);
    console.log(`   Items: ${carritoParaUsar.items.length}`);
    carritoParaUsar.items.forEach(item => {
      console.log(`   - ${item.servicio.nombre}: $${item.servicio.precio}`);
    });

    // 4. Asociar el carrito al pago
    console.log('\n🔗 Asociando carrito al pago...');
    await prisma.pago.update({
      where: { id: pagoSinCarrito.id },
      data: {
        carrito: {
          connect: { id: carritoParaUsar.id }
        }
      }
    });
    console.log('✅ Carrito asociado exitosamente');

    // 5. Procesar el pago completado con el carrito
    console.log('\n⚙️  Procesando pago completado...');
    
    const suscripcionesCreadas = [];
    const credencialesAsignadas = [];
    const fechaInicio = new Date();
    const fechaFin = new Date();
    fechaFin.setMonth(fechaFin.getMonth() + 1);

    // Crear suscripciones para cada item del carrito
    for (const item of carritoParaUsar.items) {
      console.log(`\n   Procesando item: ${item.servicio.nombre}`);
      
      // Verificar si ya existe una suscripción activa para este servicio
      const suscripcionExistente = await prisma.suscripcion.findFirst({
        where: {
          clienteId: pagoSinCarrito.clienteId,
          servicioId: item.servicioId,
          estado: 'ACTIVA'
        }
      });

      if (suscripcionExistente) {
        console.log(`   ⚠️  Ya existe suscripción activa para ${item.servicio.nombre}`);
        continue;
      }

      // Crear nueva suscripción
      console.log(`   ✅ Creando suscripción para ${item.servicio.nombre}`);
      const suscripcion = await prisma.suscripcion.create({
        data: {
          clienteId: pagoSinCarrito.clienteId,
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
      console.log(`   🔑 Buscando credenciales para ${item.servicio.nombre}`);
      
      try {
        const credencialDisponible = await prisma.credenciales.findFirst({
          where: {
            servicioId: item.servicioId,
            asignadas: false,
            activas: true
          }
        });

        if (credencialDisponible) {
          console.log(`   ✅ Asignando credencial existente`);
          
          const credencialAsignada = await prisma.credenciales.update({
            where: { id: credencialDisponible.id },
            data: {
              clienteId: pagoSinCarrito.clienteId,
              suscripcionId: suscripcion.id,
              asignadas: true
            }
          });

          credencialesAsignadas.push(credencialAsignada);
        } else {
          console.log(`   ⚠️  No hay credenciales disponibles, creando genérica`);
          
          const credencial = await prisma.credenciales.create({
            data: {
              clienteId: pagoSinCarrito.clienteId,
              servicioId: item.servicioId,
              suscripcionId: suscripcion.id,
              usuario: `user_${pagoSinCarrito.clienteId.slice(-6)}_${item.servicioId.slice(-4)}`,
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
    }

    // 6. Desactivar el carrito
    console.log('\n🗑️  Desactivando carrito...');
    await prisma.carrito.update({
      where: { id: carritoParaUsar.id },
      data: { activo: false }
    });
    console.log('✅ Carrito desactivado exitosamente');

    // 7. Asociar el pago a las suscripciones creadas
    console.log('\n🔗 Asociando pago a suscripciones...');
    for (const suscripcion of suscripcionesCreadas) {
      await prisma.suscripcion.update({
        where: { id: suscripcion.id },
        data: {
          pagos: {
            connect: { id: pagoSinCarrito.id }
          }
        }
      });
    }

    // 8. Resumen final
    console.log('\n🎉 PROCESAMIENTO COMPLETADO!');
    console.log(`   ✅ Suscripciones creadas: ${suscripcionesCreadas.length}`);
    console.log(`   ✅ Credenciales asignadas: ${credencialesAsignadas.length}`);
    console.log(`   ✅ Carrito desactivado: SÍ`);
    console.log(`   ✅ Pago asociado a suscripciones: SÍ`);

    // 9. Mostrar detalles de las suscripciones y credenciales creadas
    if (suscripcionesCreadas.length > 0) {
      console.log('\n📋 DETALLES DE LAS SUSCRIPCIONES:');
      suscripcionesCreadas.forEach(sub => {
        console.log(`   - ${sub.servicio.nombre} (${sub.servicio.categoria})`);
        console.log(`     ID: ${sub.id}`);
        console.log(`     Validez: ${sub.fechaInicio.toLocaleDateString()} - ${sub.fechaFin.toLocaleDateString()}`);
        
        const credencial = credencialesAsignadas.find(c => c.suscripcionId === sub.id);
        if (credencial) {
          console.log(`     Credencial: ${credencial.usuario} / ${credencial.password}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error al corregir problema:', error);
  } finally {
    await prisma.$disconnect();
  }
}

corregirProblemaCarrito();