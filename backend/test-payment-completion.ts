import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPaymentCompletion() {
  try {
    console.log('🧪 Probando el flujo de completar pagos automáticamente...\n');
    
    // Buscar el cliente
    const cliente = await prisma.cliente.findUnique({
      where: { email: 'usu@gmail.com' }
    });

    if (!cliente) {
      console.log('❌ Cliente no encontrado');
      return;
    }

    console.log(`👤 Cliente encontrado: ${cliente.nombre} (${cliente.email})`);

    // Buscar el carrito activo
    const carritoActivo = await prisma.carrito.findFirst({
      where: { 
        clienteId: cliente.id,
        activo: true 
      },
      include: {
        items: {
          include: {
            servicio: true
          }
        }
      }
    });

    if (!carritoActivo || carritoActivo.items.length === 0) {
      console.log('❌ No hay carrito activo con items para probar');
      return;
    }

    console.log(`🛒 Carrito activo encontrado: ${carritoActivo.id}`);
    console.log(`   Items: ${carritoActivo.items.length}`);
    carritoActivo.items.forEach(item => {
      console.log(`   - ${item.servicio.nombre} (x${item.cantidad}) - $${item.servicio.precio}`);
    });

    // Calcular el monto total
    const montoTotal = carritoActivo.items.reduce((total, item) => {
      return total + (item.servicio.precio * item.cantidad);
    }, 0);

    console.log(`💰 Monto total: $${montoTotal}`);

    // Buscar un método de pago
    const metodoPago = await prisma.metodoPago.findFirst({
      where: { disponible: true }
    });

    if (!metodoPago) {
      console.log('❌ No hay métodos de pago disponibles');
      return;
    }

    console.log(`💳 Método de pago: ${metodoPago.nombre}`);

    // Crear un pago PENDIENTE
    const nuevoPago = await prisma.pago.create({
      data: {
        clienteId: cliente.id,
        carritoId: carritoActivo.id,
        metodoPagoId: metodoPago.id,
        monto: montoTotal,
        estado: 'PENDIENTE',
        descripcion: 'Pago de prueba para testing automático'
      }
    });

    console.log(`\n✅ Pago PENDIENTE creado: ${nuevoPago.id}`);
    console.log(`   Estado: ${nuevoPago.estado}`);
    console.log(`   Monto: $${nuevoPago.monto}`);

    // Ahora simular el completar el pago manualmente
    console.log('\n🔄 Simulando completar el pago...');

    // Marcar el pago como completado
    const pagoCompletado = await prisma.pago.update({
      where: { id: nuevoPago.id },
      data: { estado: 'COMPLETADO' }
    });

    console.log(`✅ Pago marcado como COMPLETADO: ${pagoCompletado.id}`);

    // Ahora probar la función de procesamiento automático
    console.log('\n🚀 Probando procesamiento automático...');

    // Importar la función del controlador
    const { pagoController } = await import('./src/controllers/pagoController');
    
    try {
      const resultado = await pagoController.procesarPagoCompletado(nuevoPago.id);
      
      console.log('\n🎉 PROCESAMIENTO EXITOSO:');
      console.log(`   Suscripciones creadas: ${resultado.suscripcionesCreadas.length}`);
      console.log(`   Credenciales asignadas: ${resultado.credencialesAsignadas.length}`);
      console.log(`   Carrito desactivado: ${resultado.carritoDesactivado}`);

      // Mostrar detalles de las suscripciones creadas
      if (resultado.suscripcionesCreadas.length > 0) {
        console.log('\n📺 Suscripciones creadas:');
        resultado.suscripcionesCreadas.forEach((subs: any, index: number) => {
          console.log(`   ${index + 1}. ${subs.servicio.nombre} - Estado: ${subs.estado}`);
          console.log(`      Inicio: ${subs.fechaInicio}`);
          console.log(`      Fin: ${subs.fechaFin}`);
        });
      }

      // Mostrar detalles de las credenciales asignadas
      if (resultado.credencialesAsignadas.length > 0) {
        console.log('\n🔑 Credenciales asignadas:');
        resultado.credencialesAsignadas.forEach((cred: any, index: number) => {
          console.log(`   ${index + 1}. Usuario: ${cred.usuario}`);
          console.log(`      Password: ${cred.password}`);
          console.log(`      Activas: ${cred.activas}`);
        });
      }

      // Verificar que el carrito se desactivó
      const carritoVerificacion = await prisma.carrito.findUnique({
        where: { id: carritoActivo.id }
      });

      console.log(`\n🛒 Verificación del carrito:`);
      console.log(`   ID: ${carritoVerificacion?.id}`);
      console.log(`   Activo: ${carritoVerificacion?.activo}`);

    } catch (processingError) {
      console.error('❌ Error en el procesamiento automático:', processingError);
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPaymentCompletion();