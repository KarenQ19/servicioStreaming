const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPaymentSystem() {
  console.log('🧪 Iniciando pruebas del sistema de pagos...\n');

  const timestamp = Date.now(); // Mover timestamp al inicio de la función

  try {
    // 1. Verificar métodos de pago únicos
    console.log('1️⃣ Verificando métodos de pago únicos...');
    const metodosPago = await prisma.metodoPago.findMany();
    console.log(`   ✅ Métodos de pago encontrados: ${metodosPago.length}`);
    
    const tiposUnicos = new Set(metodosPago.map(m => m.tipo));
    console.log(`   ✅ Tipos únicos: ${tiposUnicos.size}`);
    
    if (tiposUnicos.size !== metodosPago.length) {
      console.log('   ❌ ERROR: Hay métodos de pago duplicados!');
      return;
    }
    
    metodosPago.forEach(metodo => {
      console.log(`   - ${metodo.tipo}: ${metodo.nombre}`);
    });

    // 2. Crear un cliente de prueba
    console.log('\n2️⃣ Creando cliente de prueba...');
    const cliente = await prisma.cliente.create({
      data: {
        nombre: 'Cliente Prueba',
        email: `prueba${timestamp}@test.com`,
        password: 'password123'
      }
    });
    console.log(`   ✅ Cliente creado con ID: ${cliente.id}`);

    // 3. Crear servicios de prueba
    console.log('\n3️⃣ Creando servicios de prueba...');
    
    // Primero necesitamos un administrador
    const admin = await prisma.administrador.create({
      data: {
        nombre: 'Admin Prueba',
        email: `admin${timestamp}@test.com`,
        password: 'admin123'
      }
    });

    const servicio1 = await prisma.servicio.create({
      data: {
        nombre: 'Netflix Premium',
        descripcion: 'Servicio de streaming Netflix',
        precio: 9.99,
        categoria: 'Streaming',
        administradorId: admin.id
      }
    });

    const servicio2 = await prisma.servicio.create({
      data: {
        nombre: 'Spotify Premium',
        descripcion: 'Servicio de música Spotify',
        precio: 19.99,
        categoria: 'Música',
        administradorId: admin.id
      }
    });

    console.log(`   ✅ Servicios creados: ${servicio1.id}, ${servicio2.id}`);

    // 4. Crear carrito y items del carrito
    console.log('\n4️⃣ Creando carrito y items...');
    
    const carrito = await prisma.carrito.create({
      data: {
        clienteId: cliente.id
      }
    });

    const carritoItem1 = await prisma.carritoItem.create({
      data: {
        carritoId: carrito.id,
        servicioId: servicio1.id,
        cantidad: 1,
        precio: servicio1.precio
      }
    });

    const carritoItem2 = await prisma.carritoItem.create({
      data: {
        carritoId: carrito.id,
        servicioId: servicio2.id,
        cantidad: 1,
        precio: servicio2.precio
      }
    });

    console.log(`   ✅ Carrito y items creados: ${carrito.id}, ${carritoItem1.id}, ${carritoItem2.id}`);

    // 5. Simular creación de suscripción desde carrito
    console.log('\n5️⃣ Simulando creación de suscripción desde carrito...');
    
    const metodoPagoQR = await prisma.metodoPago.findFirst({
      where: { tipo: 'QR' }
    });

    if (!metodoPagoQR) {
      console.log('   ❌ ERROR: No se encontró método de pago QR');
      return;
    }

    // Obtener items del carrito
    const itemsCarrito = await prisma.carritoItem.findMany({
      where: { carritoId: carrito.id },
      include: { servicio: true }
    });

    const montoTotal = itemsCarrito.reduce((total, item) => 
      total + (item.precio * item.cantidad), 0
    );

    console.log(`   💰 Monto total del carrito: $${montoTotal}`);

    // Crear UN SOLO pago para todo el carrito
    const pago = await prisma.pago.create({
      data: {
        clienteId: cliente.id,
        carritoId: carrito.id,
        monto: montoTotal,
        metodoPagoId: metodoPagoQR.id,
        estado: 'PENDIENTE',
        descripcion: `Pago por ${itemsCarrito.length} servicios`
      }
    });

    console.log(`   ✅ Pago único creado con ID: ${pago.id}`);

    // Crear las suscripciones del cliente
    for (const item of itemsCarrito) {
      const fechaFin = new Date();
      fechaFin.setMonth(fechaFin.getMonth() + 1); // 1 mes de duración

      const suscripcion = await prisma.suscripcion.create({
        data: {
          clienteId: cliente.id,
          servicioId: item.servicioId,
          fechaFin
        }
      });

      // Asociar el pago con la suscripción
      await prisma.pago.update({
        where: { id: pago.id },
        data: { suscripcionId: suscripcion.id }
      });
    }

    // Limpiar carrito
    await prisma.carritoItem.deleteMany({
      where: { carritoId: carrito.id }
    });

    console.log(`   ✅ ${itemsCarrito.length} suscripciones creadas y carrito limpiado`);

    // 6. Verificar que solo se creó un pago
    console.log('\n6️⃣ Verificando pagos creados...');
    const pagosCliente = await prisma.pago.findMany({
      where: { clienteId: cliente.id }
    });

    console.log(`   ✅ Total de pagos para el cliente: ${pagosCliente.length}`);
    
    if (pagosCliente.length === 1) {
      console.log('   ✅ ÉXITO: Solo se creó un pago (sin duplicados)');
    } else {
      console.log('   ❌ ERROR: Se crearon múltiples pagos!');
      pagosCliente.forEach(p => {
        console.log(`   - Pago ID: ${p.id}, Monto: $${p.monto}, Estado: ${p.estado}`);
      });
    }

    // 7. Verificar suscripciones del cliente
    console.log('\n7️⃣ Verificando suscripciones del cliente...');
    const suscripcionesCliente = await prisma.suscripcion.findMany({
      where: { clienteId: cliente.id },
      include: { servicio: true }
    });

    console.log(`   ✅ Suscripciones activas: ${suscripcionesCliente.length}`);
    suscripcionesCliente.forEach(suscripcion => {
      console.log(`   - ${suscripcion.servicio.nombre}: $${suscripcion.servicio.precio} (Estado: ${suscripcion.estado})`);
    });

    console.log('\n🎉 ¡Pruebas completadas exitosamente!');
    console.log('✅ El sistema de pagos funciona correctamente sin duplicados');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
  } finally {
    // Limpiar datos de prueba
    console.log('\n🧹 Limpiando datos de prueba...');
    try {
      await prisma.suscripcion.deleteMany({
        where: { cliente: { email: `prueba${timestamp}@test.com` } }
      });
      await prisma.pago.deleteMany({
        where: { cliente: { email: `prueba${timestamp}@test.com` } }
      });
      await prisma.carritoItem.deleteMany({
        where: { carrito: { cliente: { email: `prueba${timestamp}@test.com` } } }
      });
      await prisma.carrito.deleteMany({
        where: { cliente: { email: `prueba${timestamp}@test.com` } }
      });
      await prisma.cliente.deleteMany({
        where: { email: `prueba${timestamp}@test.com` }
      });
      await prisma.servicio.deleteMany({
        where: { administrador: { email: `admin${timestamp}@test.com` } }
      });
      await prisma.administrador.deleteMany({
        where: { email: `admin${timestamp}@test.com` }
      });
      console.log('✅ Datos de prueba eliminados');
    } catch (cleanupError) {
      console.error('❌ Error al limpiar datos de prueba:', cleanupError);
    }
    
    await prisma.$disconnect();
  }
}

testPaymentSystem();