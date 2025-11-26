import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testEndpoint() {
  try {
    console.log('🌐 Probando el endpoint real de completar pagos...\n');
    
    // Buscar el cliente
    const cliente = await prisma.cliente.findUnique({
      where: { email: 'usu@gmail.com' }
    });

    if (!cliente) {
      console.log('❌ Cliente no encontrado');
      return;
    }

    // Crear un nuevo carrito con items para probar
    const nuevoCarrito = await prisma.carrito.create({
      data: {
        clienteId: cliente.id,
        activo: true
      }
    });

    // Buscar algunos servicios para agregar al carrito
    const servicios = await prisma.servicio.findMany({
      take: 2
    });

    if (servicios.length === 0) {
      console.log('❌ No hay servicios disponibles');
      return;
    }

    // Agregar items al carrito
    for (const servicio of servicios) {
      await prisma.carritoItem.create({
        data: {
          carritoId: nuevoCarrito.id,
          servicioId: servicio.id,
          cantidad: 1,
          precio: servicio.precio
        }
      });
    }

    console.log(`🛒 Carrito creado: ${nuevoCarrito.id}`);
    console.log(`   Servicios agregados: ${servicios.length}`);

    // Calcular monto total
    const montoTotal = servicios.reduce((total, servicio) => total + servicio.precio, 0);

    // Buscar método de pago
    const metodoPago = await prisma.metodoPago.findFirst({
      where: { disponible: true }
    });

    if (!metodoPago) {
      console.log('❌ No hay métodos de pago disponibles');
      return;
    }

    // Crear pago PENDIENTE
    const nuevoPago = await prisma.pago.create({
      data: {
        clienteId: cliente.id,
        carritoId: nuevoCarrito.id,
        metodoPagoId: metodoPago.id,
        monto: montoTotal,
        estado: 'PENDIENTE',
        descripcion: 'Pago de prueba para endpoint'
      }
    });

    console.log(`💳 Pago creado: ${nuevoPago.id}`);
    console.log(`   Estado: ${nuevoPago.estado}`);
    console.log(`   Monto: $${nuevoPago.monto}`);

    // Ahora probar el endpoint usando fetch (simulando una llamada HTTP)
    console.log('\n🚀 Probando endpoint POST /api/pagos/:id/completar...');

    // Simular la llamada al endpoint
    const { pagoController } = await import('./src/controllers/pagoController');
    
    // Simular el objeto request y response
    const mockReq = {
      params: { id: nuevoPago.id },
      user: { id: cliente.id }
    };

    const mockRes = {
      status: (code: number) => ({
        json: (data: any) => {
          console.log(`📤 Respuesta HTTP ${code}:`);
          console.log(JSON.stringify(data, null, 2));
          return data;
        }
      }),
      json: (data: any) => {
        console.log('📤 Respuesta HTTP 200:');
        console.log(JSON.stringify(data, null, 2));
        return data;
      }
    };

    try {
      await pagoController.completar(mockReq as any, mockRes as any);
      
      // Verificar el estado después del procesamiento
      console.log('\n🔍 Verificando estado después del procesamiento...');
      
      const pagoVerificacion = await prisma.pago.findUnique({
        where: { id: nuevoPago.id },
        include: {
          carrito: true
        }
      });

      const suscripcionesCreadas = await prisma.suscripcion.findMany({
        where: { clienteId: cliente.id },
        include: { servicio: true },
        orderBy: { createdAt: 'desc' },
        take: servicios.length
      });

      const credencialesAsignadas = await prisma.credenciales.findMany({
        where: { clienteId: cliente.id },
        include: { servicio: true },
        orderBy: { createdAt: 'desc' },
        take: servicios.length
      });

      console.log('\n✅ VERIFICACIÓN FINAL:');
      console.log(`   Pago estado: ${pagoVerificacion?.estado}`);
      console.log(`   Carrito activo: ${pagoVerificacion?.carrito?.activo}`);
      console.log(`   Suscripciones nuevas: ${suscripcionesCreadas.length}`);
      console.log(`   Credenciales nuevas: ${credencialesAsignadas.length}`);

      if (suscripcionesCreadas.length > 0) {
        console.log('\n📺 Suscripciones creadas:');
        suscripcionesCreadas.forEach((subs, index) => {
          console.log(`   ${index + 1}. ${subs.servicio.nombre} - ${subs.estado}`);
        });
      }

      if (credencialesAsignadas.length > 0) {
        console.log('\n🔑 Credenciales asignadas:');
        credencialesAsignadas.forEach((cred, index) => {
          console.log(`   ${index + 1}. ${cred.servicio.nombre} - ${cred.usuario}`);
        });
      }

    } catch (endpointError) {
      console.error('❌ Error en el endpoint:', endpointError);
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEndpoint();