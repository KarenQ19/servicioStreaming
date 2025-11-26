import { PrismaClient } from '@prisma/client';
import { crearSuscripcionDesdeCarrito } from './src/controllers/suscripcionController';

const prisma = new PrismaClient();

async function testDirectFlow() {
  try {
    console.log('🧪 Probando el flujo corregido directamente para el usuario benja@gmail.com');
    
    // 1. Buscar el usuario benja
    const usuario = await prisma.cliente.findUnique({
      where: { email: 'benja@gmail.com' }
    });
    
    if (!usuario) {
      console.log('❌ Usuario benja@gmail.com no encontrado');
      return;
    }
    
    console.log(`✅ Usuario encontrado: ${usuario.nombre} (${usuario.email})`);
    
    // 2. Verificar estado inicial
    console.log('\n📊 Estado inicial:');
    
    const carritoActivo = await prisma.carrito.findFirst({
      where: { clienteId: usuario.id, activo: true },
      include: { items: { include: { servicio: true } } }
    });
    
    const suscripciones = await prisma.suscripcion.findMany({
      where: { clienteId: usuario.id },
      include: { servicio: true }
    });
    
    const credenciales = await prisma.credenciales.findMany({
      where: { clienteId: usuario.id, activas: true }
    });
    
    console.log(`- Carrito activo: ${carritoActivo ? `Sí (${carritoActivo.items.length} items)` : 'No'}`);
    console.log(`- Suscripciones: ${suscripciones.length}`);
    console.log(`- Credenciales: ${credenciales.length}`);
    
    if (carritoActivo && carritoActivo.items.length > 0) {
      console.log('\n🛒 Items en el carrito:');
      carritoActivo.items.forEach(item => {
        console.log(`  - ${item.servicio.nombre}: $${item.precio} x ${item.cantidad}`);
      });
      
      // 3. Obtener un método de pago
      const metodoPago = await prisma.metodoPago.findFirst();
      if (!metodoPago) {
        console.log('❌ No hay métodos de pago disponibles');
        return;
      }
      
      console.log(`\n💳 Usando método de pago: ${metodoPago.nombre}`);
      
      // 4. Simular el flujo del frontend corregido llamando directamente a la función
      console.log('\n🔄 Ejecutando flujo corregido...');
      
      // Crear objetos mock para req y res
      const mockReq = {
        user: { id: usuario.id },
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
          console.log('✅ Flujo ejecutado exitosamente');
          console.log('📄 Respuesta:', JSON.stringify(responseData, null, 2));
          
          // 5. Verificar estado final
          console.log('\n📊 Estado final:');
          
          const carritoFinal = await prisma.carrito.findFirst({
            where: { clienteId: usuario.id, activo: true },
            include: { items: true }
          });
          
          const suscripcionesFinal = await prisma.suscripcion.findMany({
            where: { clienteId: usuario.id },
            include: { servicio: true }
          });
          
          const credencialesFinal = await prisma.credenciales.findMany({
            where: { clienteId: usuario.id, activas: true }
          });
          
          console.log(`- Carrito activo: ${carritoFinal ? `Sí (${carritoFinal.items.length} items)` : 'No'}`);
          console.log(`- Suscripciones: ${suscripcionesFinal.length}`);
          console.log(`- Credenciales: ${credencialesFinal.length}`);
          
          if (suscripcionesFinal.length > suscripciones.length) {
            console.log('\n🎉 ¡Nuevas suscripciones creadas!');
            const nuevasSuscripciones = suscripcionesFinal.slice(suscripciones.length);
            nuevasSuscripciones.forEach(sub => {
              console.log(`  - ${sub.servicio.nombre} (${sub.estado})`);
            });
          }
          
          if (credencialesFinal.length > credenciales.length) {
            console.log('\n🔑 ¡Nuevas credenciales asignadas!');
            const nuevasCredenciales = credencialesFinal.slice(credenciales.length);
            nuevasCredenciales.forEach(cred => {
              console.log(`  - Usuario: ${cred.usuario}, Password: ${cred.password}`);
            });
          }
          
          // Verificar que el carrito se desactivó
          if (carritoFinal?.items.length === 0 || !carritoFinal) {
            console.log('\n✅ ¡El carrito se vació correctamente!');
          } else {
            console.log('\n⚠️ El carrito aún tiene items');
          }
          
        } else {
          console.log('❌ Error en la ejecución:', responseStatus, responseData);
        }
        
      } catch (error) {
        console.error('❌ Error al ejecutar la función:', error);
      }
      
    } else {
      console.log('\n⚠️ No hay items en el carrito para probar');
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDirectFlow();