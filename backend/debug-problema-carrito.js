const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verificarProblemaCarrito() {
  try {
    console.log('🔍 VERIFICANDO PROBLEMA DEL CARRITO EN PAGOS QR\n');

    // 1. Verificar el pago QR más reciente
    console.log('1. PAGO QR MÁS RECIENTE:');
    const pago = await prisma.pago.findFirst({
      where: {
        estado: 'COMPLETADO',
        metodoPago: {
          tipo: 'QR'
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

    if (!pago) {
      console.log('❌ No se encontró ningún pago QR completado');
      return;
    }

    console.log(`   💰 Pago ID: ${pago.id}`);
    console.log(`      Cliente: ${pago.cliente.nombre} (${pago.cliente.email})`);
    console.log(`      Monto: $${pago.monto}`);
    console.log(`      Estado: ${pago.estado}`);
    console.log(`      Método: ${pago.metodoPago.tipo}`);
    console.log(`      Descripción: ${pago.descripcion || 'Sin descripción'}`);
    console.log(`      Tiene Carrito: ${pago.carrito.length > 0 ? 'SÍ' : 'NO'}`);
    console.log(`      Tiene QR: ${pago.qr.length > 0 ? 'SÍ' : 'NO'}`);

    // 2. Verificar TODOS los carritos del cliente
    console.log('\n2. TODOS LOS CARRITOS DEL CLIENTE:');
    const todosCarritos = await prisma.carrito.findMany({
      where: { clienteId: pago.clienteId },
      include: {
        items: {
          include: { servicio: true }
        },
        pagos: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`   Total carritos: ${todosCarritos.length}`);
    
    todosCarritos.forEach((carrito, index) => {
      console.log(`\n   🛒 Carrito ${index + 1}: ${carrito.id}`);
      console.log(`      Activo: ${carrito.activo}`);
      console.log(`      Items: ${carrito.items.length}`);
      console.log(`      Pagos: ${carrito.pagos.length}`);
      
      if (carrito.items.length > 0) {
        carrito.items.forEach(item => {
          console.log(`         - ${item.servicio.nombre}: $${item.servicio.precio}`);
        });
      }
      
      if (carrito.pagos.length > 0) {
        console.log(`      Último pago: ${carrito.pagos[0].id} - $${carrito.pagos[0].monto} - ${carrito.pagos[0].estado}`);
      }
    });

    // 3. Buscar carritos activos con pagos completados
    console.log('\n3. CARRITOS ACTIVOS CON PAGOS COMPLETADOS:');
    const carritosActivosConPagos = todosCarritos.filter(c => 
      c.activo === true && c.pagos.some(p => p.estado === 'COMPLETADO')
    );

    console.log(`   Encontrados: ${carritosActivosConPagos.length}`);
    carritosActivosConPagos.forEach(carrito => {
      const pagosCompletados = carrito.pagos.filter(p => p.estado === 'COMPLETADO');
      console.log(`   - Carrito ${carrito.id}:`);
      console.log(`     Items: ${carrito.items.length}`);
      console.log(`     Pagos completados: ${pagosCompletados.length}`);
      pagosCompletados.forEach(pagoComp => {
        console.log(`       * Pago ${pagoComp.id}: $${pagoComp.monto}`);
      });
    });

    // 4. Verificar si el pago tiene carrito asociado
    console.log('\n4. VERIFICACIÓN DEL CARRITO ASOCIADO:');
    if (pago.carrito.length > 0) {
      const carrito = pago.carrito[0];
      console.log(`   ✅ Pago tiene carrito asociado: ${carrito.id}`);
      console.log(`      Carrito activo: ${carrito.activo}`);
      console.log(`      Items en carrito: ${carrito.items.length}`);
      
      if (carrito.activo && pago.estado === 'COMPLETADO') {
        console.log(`   ⚠️  PROBLEMA: Carrito activo con pago completado`);
      }
      
      // Verificar suscripciones
      const suscripciones = await prisma.suscripcion.findMany({
        where: {
          clienteId: pago.clienteId,
          pagos: {
            some: { id: pago.id }
          }
        },
        include: { 
          servicio: true,
          credenciales: {
            where: { asignadas: true }
          }
        }
      });
      
      console.log(`      Suscripciones creadas para este pago: ${suscripciones.length}`);
      suscripciones.forEach(sub => {
        console.log(`        - ${sub.servicio.nombre} (${sub.credenciales.length} credenciales)`);
      });
      
    } else {
      console.log(`   ❌ Pago NO tiene carrito asociado`);
      console.log(`   Esto explica por qué no se crearon suscripciones ni se asignaron credenciales`);
    }

    // 5. Buscar posibles causas
    console.log('\n5. ANÁLISIS DE POSIBLES CAUSAS:');
    
    // Verificar si hay carritos con el mismo cliente que podrían haber sido usados
    const carritosUtiles = todosCarritos.filter(c => 
      c.activo === true && c.items.length > 0
    );
    
    if (carritosUtiles.length > 0) {
      console.log(`   📋 Carritos útiles encontrados: ${carritosUtiles.length}`);
      carritosUtiles.forEach(carrito => {
        console.log(`      - Carrito ${carrito.id}: ${carrito.items.length} items, activo: ${carrito.activo}`);
      });
    }
    
    // Verificar el flujo de creación de pagos
    console.log('\n6. FLUJO DE CREACIÓN DE PAGOS:');
    console.log(`   El pago fue creado el: ${pago.createdAt}`);
    console.log(`   El QR fue creado el: ${pago.qr.length > 0 ? pago.qr[0].createdAt : 'N/A'}`);
    
    if (pago.qr.length > 0) {
      const qr = pago.qr[0];
      console.log(`   Estado del QR: ${qr.estado}`);
      console.log(`   ¿El QR fue usado?: ${qr.estado === 'USADO' ? 'SÍ' : 'NO'}`);
      
      if (qr.estado === 'USADO' && pago.carrito.length === 0) {
        console.log(`   🚨 PROBLEMA CRÍTICO: El QR fue usado pero el pago no tiene carrito`);
        console.log(`   Esto significa que el procesamiento automático nunca se ejecutó`);
      }
    }

    // 7. Solución propuesta
    console.log('\n7. SOLUCIÓN PROPUESTA:');
    if (pago.carrito.length === 0) {
      console.log(`   1. Asociar un carrito existente al pago`);
      console.log(`   2. Ejecutar el procesamiento manual del pago`);
      console.log(`   3. Verificar que se creen las suscripciones y se asignen credenciales`);
      console.log(`   4. Desactivar el carrito después del procesamiento`);
    } else if (pago.carrito[0].activo) {
      console.log(`   1. El carrito ya está asociado pero está activo`);
      console.log(`   2. Verificar si las suscripciones ya fueron creadas`);
      console.log(`   3. Si no hay suscripciones, ejecutar procesamiento manual`);
      console.log(`   4. Desactivar el carrito después`);
    }

  } catch (error) {
    console.error('❌ Error en verificación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarProblemaCarrito();