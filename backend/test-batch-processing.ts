import { PrismaClient } from '@prisma/client';
import { pagoController } from './src/controllers/pagoController';

const prisma = new PrismaClient();

async function testBatchProcessing() {
  try {
    console.log('🔍 Iniciando prueba de procesamiento en lote...\n');

    // Buscar un cliente para la prueba
    const cliente = await prisma.cliente.findFirst({
      where: {
        email: 'usu@gmail.com'
      }
    });

    if (!cliente) {
      console.log('❌ No se encontró el cliente usu@gmail.com');
      return;
    }

    console.log(`✅ Cliente encontrado: ${cliente.email} (ID: ${cliente.id})\n`);

    // Crear algunos pagos completados con carritos activos para simular pagos no procesados
    console.log('📦 Creando pagos de prueba...');

    // Obtener servicios disponibles
    const servicios = await prisma.servicio.findMany({
      take: 2
    });

    if (servicios.length === 0) {
      console.log('❌ No hay servicios disponibles');
      return;
    }

    // Obtener un método de pago existente
    const metodoPago = await prisma.metodoPago.findFirst();
    if (!metodoPago) {
      console.log('❌ No hay métodos de pago disponibles');
      return;
    }

    // Crear carritos y pagos de prueba
    const pagosCreados: any[] = [];
    
    for (let i = 0; i < 2; i++) {
      // Crear carrito
      const carrito = await prisma.carrito.create({
        data: {
          clienteId: cliente.id,
          activo: true
        }
      });

      // Agregar items al carrito
      for (const servicio of servicios) {
        await prisma.carritoItem.create({
          data: {
            carritoId: carrito.id,
            servicioId: servicio.id,
            cantidad: 1,
            precio: servicio.precio
          }
        });
      }

      // Calcular monto total
      const montoTotal = servicios.reduce((sum, s) => sum + s.precio, 0);

      // Crear pago completado
      const pago = await prisma.pago.create({
        data: {
          clienteId: cliente.id,
          carritoId: carrito.id,
          monto: montoTotal,
          estado: 'COMPLETADO', // Ya completado pero no procesado
          metodoPagoId: metodoPago.id
        }
      });

      pagosCreados.push(pago);
      console.log(`   ✅ Pago ${i + 1} creado: $${montoTotal} (ID: ${pago.id})`);
    }

    console.log(`\n📊 Estado inicial:`);
    
    // Verificar pagos completados no procesados
    const pagosNoProcessados = await prisma.pago.findMany({
      where: {
        clienteId: cliente.id,
        estado: 'COMPLETADO',
        carrito: {
          activo: true
        }
      },
      include: {
        carrito: {
          include: {
            items: true
          }
        }
      }
    });

    console.log(`   📋 Pagos completados no procesados: ${pagosNoProcessados.length}`);

    // Simular llamada al endpoint de procesamiento en lote
    console.log('\n🚀 Simulando llamada al endpoint /api/pagos/procesar-completados...\n');

    // Crear mock request y response
    const mockReq = {
      user: { id: cliente.id }
    } as any;

    const mockRes = {
      json: (data: any) => {
        console.log('📤 Respuesta del endpoint:');
        console.log(JSON.stringify(data, null, 2));
        return mockRes;
      },
      status: (code: number) => {
        console.log(`📊 Status Code: ${code}`);
        return mockRes;
      }
    } as any;

    // Llamar al controlador
    await pagoController.procesarCompletados(mockReq, mockRes);

    // Verificar estado final
    console.log('\n📊 Estado final:');
    
    const pagosFinales = await prisma.pago.findMany({
      where: {
        clienteId: cliente.id,
        estado: 'COMPLETADO',
        carrito: {
          activo: true
        }
      }
    });

    console.log(`   📋 Pagos completados no procesados restantes: ${pagosFinales.length}`);

    const suscripcionesCreadas = await prisma.suscripcion.findMany({
      where: {
        clienteId: cliente.id
      },
      include: {
        servicio: true
      }
    });

    console.log(`   🎯 Suscripciones activas: ${suscripcionesCreadas.length}`);
    suscripcionesCreadas.forEach((sub: any) => {
      console.log(`      - ${sub.servicio.nombre}: ${sub.activa ? 'Activa' : 'Inactiva'}`);
    });

    const credencialesAsignadas = await prisma.credenciales.findMany({
      where: {
        clienteId: cliente.id,
        asignadas: true
      },
      include: {
        servicio: true
      }
    });

    console.log(`   🔑 Credenciales asignadas: ${credencialesAsignadas.length}`);
    credencialesAsignadas.forEach((cred: any) => {
      console.log(`      - ${cred.servicio.nombre}: ${cred.usuario} / ${cred.contrasena}`);
    });

    console.log('\n✅ Prueba de procesamiento en lote completada exitosamente!');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBatchProcessing();