import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFixedFlow() {
  try {
    console.log('🧪 Probando el flujo corregido para el usuario benja@gmail.com');
    
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
      
      // 3. Simular el flujo del frontend corregido
      console.log('\n🔄 Simulando flujo del frontend corregido...');
      
      // Obtener un método de pago
      const metodoPago = await prisma.metodoPago.findFirst();
      if (!metodoPago) {
        console.log('❌ No hay métodos de pago disponibles');
        return;
      }
      
      // Simular llamada al endpoint corregido
      const response = await fetch('http://localhost:3000/api/suscripciones/carrito', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${usuario.id}` // Simulado
        },
        body: JSON.stringify({
          metodoPagoId: metodoPago.id
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Respuesta del endpoint:', result);
        
        // 4. Verificar estado final
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
        
      } else {
        console.log('❌ Error en la respuesta del endpoint:', response.status, response.statusText);
        const errorText = await response.text();
        console.log('Error details:', errorText);
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

testFixedFlow();