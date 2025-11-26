import { PrismaClient } from '@prisma/client';
import { crearSuscripcionDesdeCarrito } from './src/controllers/suscripcionController';

const prisma = new PrismaClient();

async function testNewUserFlow() {
  try {
    console.log('🧪 Probando el flujo completo con un NUEVO USUARIO');
    console.log('='.repeat(60));
    
    // 1. Crear un nuevo usuario de prueba
    const nuevoUsuario = await prisma.cliente.create({
      data: {
        nombre: 'Usuario Prueba',
        email: `test-${Date.now()}@example.com`,
        password: 'password123'
      }
    });
    
    console.log(`✅ Nuevo usuario creado: ${nuevoUsuario.nombre} (${nuevoUsuario.email})`);
    console.log(`   ID: ${nuevoUsuario.id}`);
    
    // 2. Crear un carrito con algunos servicios
    const servicios = await prisma.servicio.findMany({ take: 2 });
    if (servicios.length < 2) {
      console.log('❌ No hay suficientes servicios para la prueba');
      return;
    }
    
    const carrito = await prisma.carrito.create({
      data: {
        clienteId: nuevoUsuario.id,
        activo: true,
        items: {
          create: servicios.map(servicio => ({
            servicioId: servicio.id,
            cantidad: 1,
            precio: servicio.precio
          }))
        }
      },
      include: { items: { include: { servicio: true } } }
    });
    
    console.log(`\n🛒 Carrito creado con ${carrito.items.length} items:`);
    let totalCarrito = 0;
    carrito.items.forEach(item => {
      console.log(`   - ${item.servicio.nombre}: $${item.precio} x ${item.cantidad}`);
      totalCarrito += item.precio * item.cantidad;
    });
    console.log(`   💰 Total del carrito: $${totalCarrito}`);
    
    // 3. Verificar estado inicial
    console.log('\n📊 Estado inicial del usuario:');
    const estadoInicial = await verificarEstadoUsuario(nuevoUsuario.id);
    
    // 4. Obtener método de pago
    const metodoPago = await prisma.metodoPago.findFirst();
    if (!metodoPago) {
      console.log('❌ No hay métodos de pago disponibles');
      return;
    }
    
    console.log(`\n💳 Usando método de pago: ${metodoPago.nombre}`);
    
    // 5. Simular el flujo del frontend (crear suscripción desde carrito)
    console.log('\n🔄 Ejecutando flujo de pago...');
    
    const mockReq = {
      user: { id: nuevoUsuario.id },
      body: { metodoPagoId: metodoPago.id }
    } as any;
    
    let responseData: any = null;
    let responseStatus = 200;
    
    const mockRes = {
      status: (code: number) => {
        responseStatus = code;
        return mockRes;
      },
      json: (data: any) => {
        responseData = data;
        return mockRes;
      }
    } as any;
    
    try {
      await crearSuscripcionDesdeCarrito(mockReq, mockRes);
      
      if (responseStatus === 200 && responseData?.success) {
        console.log('✅ Flujo de pago ejecutado exitosamente');
        
        // 6. Verificar estado final
        console.log('\n📊 Estado final del usuario:');
        const estadoFinal = await verificarEstadoUsuario(nuevoUsuario.id);
        
        // 7. Comparar estados y validar
        console.log('\n🔍 VALIDACIÓN DEL FLUJO:');
        
        // Verificar que el carrito se desactivó
        if (estadoFinal.carritoActivo === null) {
          console.log('✅ El carrito se desactivó correctamente');
        } else {
          console.log('❌ ERROR: El carrito sigue activo');
        }
        
        // Verificar que se crearon suscripciones
        if (estadoFinal.suscripciones > estadoInicial.suscripciones) {
          console.log(`✅ Se crearon ${estadoFinal.suscripciones - estadoInicial.suscripciones} suscripciones`);
        } else {
          console.log('❌ ERROR: No se crearon suscripciones');
        }
        
        // Verificar que se asignaron credenciales
        if (estadoFinal.credenciales > estadoInicial.credenciales) {
          console.log(`✅ Se asignaron ${estadoFinal.credenciales - estadoInicial.credenciales} credenciales`);
        } else {
          console.log('❌ ERROR: No se asignaron credenciales');
        }
        
        // Verificar que se creó el pago
        if (estadoFinal.pagos > estadoInicial.pagos) {
          console.log(`✅ Se creó ${estadoFinal.pagos - estadoInicial.pagos} pago`);
        } else {
          console.log('❌ ERROR: No se creó el pago');
        }
        
        // Verificar que el pago está asociado al carrito
        const pagoCreado = await prisma.pago.findFirst({
          where: { clienteId: nuevoUsuario.id },
          orderBy: { createdAt: 'desc' }
        });
        
        if (pagoCreado && pagoCreado.carritoId) {
          console.log('✅ El pago está correctamente asociado al carrito');
        } else {
          console.log('❌ ERROR: El pago no está asociado al carrito');
        }
        
        // 8. Resultado final
        const todoFunciona = 
          estadoFinal.carritoActivo === null &&
          estadoFinal.suscripciones > estadoInicial.suscripciones &&
          estadoFinal.credenciales > estadoInicial.credenciales &&
          estadoFinal.pagos > estadoInicial.pagos &&
          pagoCreado?.carritoId;
        
        console.log('\n' + '='.repeat(60));
        if (todoFunciona) {
          console.log('🎉 ¡PRUEBA EXITOSA! El flujo funciona correctamente para nuevos usuarios');
          console.log('✅ El error del carrito que no se vacía NO se repetirá');
        } else {
          console.log('❌ PRUEBA FALLIDA: Hay problemas en el flujo');
        }
        
      } else {
        console.log('❌ Error en la ejecución del flujo:', responseStatus, responseData);
      }
      
    } catch (error) {
      console.error('❌ Error al ejecutar el flujo:', error);
    }
    
    // 9. Limpiar datos de prueba
    console.log('\n🧹 Limpiando datos de prueba...');
    await limpiarDatosPrueba(nuevoUsuario.id);
    console.log('✅ Datos de prueba eliminados');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function verificarEstadoUsuario(clienteId: string) {
  const carritoActivo = await prisma.carrito.findFirst({
    where: { clienteId, activo: true },
    include: { items: true }
  });
  
  const suscripciones = await prisma.suscripcion.count({
    where: { clienteId }
  });
  
  const credenciales = await prisma.credenciales.count({
    where: { clienteId, activas: true }
  });
  
  const pagos = await prisma.pago.count({
    where: { clienteId }
  });
  
  const estado = {
    carritoActivo: carritoActivo ? `${carritoActivo.items.length} items` : null,
    suscripciones,
    credenciales,
    pagos
  };
  
  console.log(`   🛒 Carrito activo: ${estado.carritoActivo || 'No'}`);
  console.log(`   📋 Suscripciones: ${estado.suscripciones}`);
  console.log(`   🔑 Credenciales: ${estado.credenciales}`);
  console.log(`   💳 Pagos: ${estado.pagos}`);
  
  return estado;
}

async function limpiarDatosPrueba(clienteId: string) {
  // Eliminar en orden correcto para respetar las relaciones
  await prisma.credenciales.deleteMany({ where: { clienteId } });
  await prisma.suscripcion.deleteMany({ where: { clienteId } });
  await prisma.pago.deleteMany({ where: { clienteId } });
  await prisma.carritoItem.deleteMany({ 
    where: { carrito: { clienteId } } 
  });
  await prisma.carrito.deleteMany({ where: { clienteId } });
  await prisma.cliente.delete({ where: { id: clienteId } });
}

testNewUserFlow();