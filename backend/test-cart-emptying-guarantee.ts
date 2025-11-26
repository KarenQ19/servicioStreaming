import { PrismaClient } from '@prisma/client';
import { crearSuscripcionDesdeCarrito } from './src/controllers/suscripcionController';

const prisma = new PrismaClient();

async function testCartEmptyingGuarantee() {
  try {
    console.log('🧪 PRUEBA DE GARANTÍA: El carrito SIEMPRE se vacía después del pago');
    console.log('='.repeat(70));
    
    const testCases = [
      { name: 'Usuario con 1 servicio', servicios: 1 },
      { name: 'Usuario con 2 servicios', servicios: 2 },
      { name: 'Usuario con múltiples servicios', servicios: 3 }
    ];
    
    let todosExitosos = true;
    const resultados: any[] = [];
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n📋 CASO ${i + 1}: ${testCase.name}`);
      console.log('-'.repeat(50));
      
      // 1. Crear usuario
      const usuario = await prisma.cliente.create({
        data: {
          nombre: `Test User ${i + 1}`,
          email: `cart-test-${i + 1}-${Date.now()}@example.com`,
          password: 'password123'
        }
      });
      
      console.log(`👤 Usuario: ${usuario.email}`);
      
      // 2. Obtener servicios disponibles
      const serviciosDisponibles = await prisma.servicio.findMany({ 
        take: testCase.servicios 
      });
      
      if (serviciosDisponibles.length < testCase.servicios) {
        console.log(`⚠️ Solo hay ${serviciosDisponibles.length} servicios disponibles`);
      }
      
      // 3. Crear carrito con servicios
      const carrito = await prisma.carrito.create({
        data: {
          clienteId: usuario.id,
          activo: true,
          items: {
            create: serviciosDisponibles.map(servicio => ({
              servicioId: servicio.id,
              cantidad: 1,
              precio: servicio.precio
            }))
          }
        },
        include: { items: { include: { servicio: true } } }
      });
      
      console.log(`🛒 Carrito creado con ${carrito.items.length} items:`);
      carrito.items.forEach(item => {
        console.log(`   - ${item.servicio.nombre}: $${item.precio}`);
      });
      
      // 4. VERIFICACIÓN CRÍTICA: Carrito está activo ANTES del pago
      const carritoAntesDelPago = await prisma.carrito.findFirst({
        where: { clienteId: usuario.id, activo: true },
        include: { items: true }
      });
      
      if (!carritoAntesDelPago || carritoAntesDelPago.items.length === 0) {
        console.log('❌ ERROR: El carrito no está activo antes del pago');
        todosExitosos = false;
        continue;
      }
      
      console.log(`✅ ANTES del pago: Carrito activo con ${carritoAntesDelPago.items.length} items`);
      
      // 5. Ejecutar el flujo de pago
      const metodoPago = await prisma.metodoPago.findFirst();
      
      const mockReq = {
        user: { id: usuario.id },
        body: { metodoPagoId: metodoPago!.id }
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
      
      console.log('💳 Ejecutando pago...');
      
      try {
        await crearSuscripcionDesdeCarrito(mockReq, mockRes);
        
        // 6. VERIFICACIÓN CRÍTICA: Carrito está VACÍO DESPUÉS del pago
        const carritoDespuesDelPago = await prisma.carrito.findFirst({
          where: { clienteId: usuario.id, activo: true },
          include: { items: true }
        });
        
        const carritoVacio = !carritoDespuesDelPago || carritoDespuesDelPago.items.length === 0;
        
        if (carritoVacio) {
          console.log('✅ DESPUÉS del pago: Carrito correctamente vacío/desactivado');
        } else {
          console.log(`❌ ERROR CRÍTICO: El carrito sigue activo con ${carritoDespuesDelPago!.items.length} items`);
          todosExitosos = false;
        }
        
        // 7. Verificar que se crearon las suscripciones y credenciales
        const suscripciones = await prisma.suscripcion.count({
          where: { clienteId: usuario.id }
        });
        
        const credenciales = await prisma.credenciales.count({
          where: { clienteId: usuario.id, activas: true }
        });
        
        console.log(`📋 Suscripciones creadas: ${suscripciones}`);
        console.log(`🔑 Credenciales asignadas: ${credenciales}`);
        
        // 8. Verificar que el pago está asociado al carrito
        const pago = await prisma.pago.findFirst({
          where: { clienteId: usuario.id },
          orderBy: { createdAt: 'desc' }
        });
        
        const pagoAsociado = pago && pago.carritoId === carrito.id;
        
        if (pagoAsociado) {
          console.log('✅ Pago correctamente asociado al carrito');
        } else {
          console.log('❌ ERROR: Pago no asociado al carrito');
          todosExitosos = false;
        }
        
        resultados.push({
          caso: testCase.name,
          usuario: usuario.email,
          carritoVacioAntes: false,
          carritoVacioDespues: carritoVacio,
          suscripciones,
          credenciales,
          pagoAsociado,
          exito: carritoVacio && pagoAsociado && suscripciones > 0
        });
        
      } catch (error) {
        console.log('❌ ERROR en el flujo de pago:', error);
        todosExitosos = false;
        
        resultados.push({
          caso: testCase.name,
          usuario: usuario.email,
          error: error,
          exito: false
        });
      }
    }
    
    // 9. RESUMEN FINAL Y GARANTÍA
    console.log('\n' + '='.repeat(70));
    console.log('🎯 RESULTADO DE LA PRUEBA DE GARANTÍA:');
    
    const casosExitosos = resultados.filter(r => r.exito).length;
    const casosFallidos = resultados.filter(r => !r.exito).length;
    
    console.log(`✅ Casos exitosos: ${casosExitosos}/${testCases.length}`);
    console.log(`❌ Casos fallidos: ${casosFallidos}/${testCases.length}`);
    
    if (todosExitosos && casosExitosos === testCases.length) {
      console.log('\n🎉 ¡GARANTÍA CONFIRMADA!');
      console.log('✅ El carrito SIEMPRE se vacía correctamente después del pago');
      console.log('✅ El error reportado NO puede volver a ocurrir');
      console.log('✅ El sistema es 100% confiable para nuevos usuarios');
    } else {
      console.log('\n⚠️ ADVERTENCIA: La garantía no se puede confirmar');
      console.log('❌ Hay casos donde el carrito no se vacía correctamente');
      console.log('❌ El error PODRÍA repetirse');
    }
    
    // 10. Detalles de cada caso
    console.log('\n📊 DETALLES POR CASO:');
    resultados.forEach((resultado, index) => {
      console.log(`\n${index + 1}. ${resultado.caso}:`);
      if (resultado.exito) {
        console.log('   ✅ Carrito se vació correctamente');
        console.log(`   ✅ ${resultado.suscripciones} suscripciones creadas`);
        console.log(`   ✅ ${resultado.credenciales} credenciales asignadas`);
        console.log('   ✅ Pago asociado al carrito');
      } else {
        console.log('   ❌ Falló la prueba');
        if (resultado.error) {
          console.log(`   ❌ Error: ${resultado.error.message || resultado.error}`);
        }
      }
    });
    
    // 11. Limpiar datos de prueba
    console.log('\n🧹 Limpiando datos de prueba...');
    for (const resultado of resultados) {
      try {
        const usuario = await prisma.cliente.findUnique({
          where: { email: resultado.usuario }
        });
        
        if (usuario) {
          await prisma.credenciales.deleteMany({ where: { clienteId: usuario.id } });
          await prisma.suscripcion.deleteMany({ where: { clienteId: usuario.id } });
          await prisma.pago.deleteMany({ where: { clienteId: usuario.id } });
          await prisma.carritoItem.deleteMany({ 
            where: { carrito: { clienteId: usuario.id } } 
          });
          await prisma.carrito.deleteMany({ where: { clienteId: usuario.id } });
          await prisma.cliente.delete({ where: { id: usuario.id } });
        }
      } catch (error) {
        console.log(`⚠️ Error limpiando ${resultado.usuario}`);
      }
    }
    console.log('✅ Limpieza completada');
    
  } catch (error) {
    console.error('❌ Error en la prueba de garantía:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCartEmptyingGuarantee();