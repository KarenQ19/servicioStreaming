const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugProcesoCompleto() {
  try {
    console.log('🔍 DEBUG: Análisis completo del proceso de pago QR\n');

    // 1. Verificar el pago más reciente con QR
    console.log('1. PAGO QR MÁS RECIENTE:');
    const pagoReciente = await prisma.pago.findFirst({
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

    if (pagoReciente) {
      console.log(`   💰 Pago ID: ${pagoReciente.id}`);
      console.log(`      Cliente: ${pagoReciente.cliente.nombre}`);
      console.log(`      Monto: $${pagoReciente.monto}`);
      console.log(`      Estado: ${pagoReciente.estado}`);
      console.log(`      Método: ${pagoReciente.metodoPago.tipo}`);
      console.log(`      Fecha: ${pagoReciente.createdAt}`);
      console.log(`      Tiene Carrito: ${pagoReciente.carrito.length > 0 ? 'SÍ' : 'NO'}`);
      console.log(`      Tiene QR: ${pagoReciente.qr.length > 0 ? 'SÍ' : 'NO'}`);
      
      if (pagoReciente.qr.length > 0) {
        console.log(`      Estado QR: ${pagoReciente.qr[0].estado}`);
        console.log(`      Código QR: ${pagoReciente.qr[0].codigo}`);
      }
    }

    // 2. Verificar suscripciones de este pago
    console.log('\n2. SUSCRIPCIONES DEL PAGO:');
    const suscripciones = await prisma.suscripcion.findMany({
      where: {
        clienteId: pagoReciente.clienteId,
        pagos: {
          some: { id: pagoReciente.id }
        }
      },
      include: { 
        servicio: true,
        credenciales: {
          where: { asignadas: true }
        }
      }
    });

    console.log(`   Total suscripciones: ${suscripciones.length}`);
    suscripciones.forEach(sub => {
      console.log(`   - ${sub.servicio.nombre} (${sub.credenciales.length} credenciales)`);
    });

    // 3. Verificar carritos activos del cliente
    console.log('\n3. CARRITOS ACTIVOS DEL CLIENTE:');
    const carritosActivos = await prisma.carrito.findMany({
      where: { 
        clienteId: pagoReciente.clienteId,
        activo: true
      },
      include: {
        pagos: {
          where: { estado: 'COMPLETADO' }
        }
      }
    });

    console.log(`   Carritos activos: ${carritosActivos.length}`);
    carritosActivos.forEach(carrito => {
      console.log(`   - Carrito ID: ${carrito.id}`);
      console.log(`     Pagos completados: ${carrito.pagos.length}`);
      if (carrito.pagos.length > 0) {
        console.log(`     Último pago: ${carrito.pagos[0].id} - $${carrito.pagos[0].monto}`);
      }
    });

    // 4. Simular el proceso de usarQR
    console.log('\n4. SIMULANDO PROCESO usarQR:');
    
    if (pagoReciente.qr.length > 0) {
      const qr = pagoReciente.qr[0];
      console.log(`   Usando QR: ${qr.codigo}`);
      
      try {
        // Simular el proceso que debería ejecutar usarQR
        console.log('   Paso 1: Verificar QR existe y está activo');
        console.log(`   - QR estado: ${qr.estado}`);
        console.log(`   - QR expira: ${qr.expiresAt}`);
        
        const ahora = new Date();
        const haExpirado = qr.expiresAt < ahora;
        console.log(`   - Ha expirado: ${haExpirado}`);
        
        if (qr.estado === 'ACTIVO' && !haExpirado) {
          console.log('   ✅ QR válido, procediendo...');
          
          console.log('   Paso 2: Marcar QR como USADO y pago como COMPLETADO');
          console.log('   Paso 3: Llamar a procesarPagoCompletado');
          
          // Verificar si el pago tiene carrito
          if (pagoReciente.carrito.length > 0) {
            const carrito = pagoReciente.carrito[0];
            console.log(`   - Carrito encontrado: ${carrito.id}`);
            console.log(`   - Carrito activo: ${carrito.activo}`);
            
            // Ver items del carrito
            const items = await prisma.carritoItem.findMany({
              where: { carritoId: carrito.id },
              include: { servicio: true }
            });
            
            console.log(`   - Items en carrito: ${items.length}`);
            items.forEach(item => {
              console.log(`     * ${item.servicio.nombre}: $${item.servicio.precio}`);
            });
            
            if (items.length > 0) {
              console.log('   ✅ Hay items para procesar');
              
              // Verificar si ya hay suscripciones
              if (suscripciones.length === 0) {
                console.log('   ⚠️  No hay suscripciones creadas - PROCESAMIENTO FALLIDO');
              } else {
                console.log('   ✅ Ya hay suscripciones creadas');
              }
              
            } else {
              console.log('   ❌ No hay items en el carrito');
            }
            
          } else {
            console.log('   ❌ No hay carrito asociado al pago');
          }
          
        } else {
          console.log('   ❌ QR no válido o expirado');
        }
        
      } catch (error) {
        console.log(`   ❌ Error en simulación: ${error.message}`);
      }
    }

    // 5. Verificar credenciales disponibles
    console.log('\n5. CREDENCIALES DISPONIBLES:');
    const credencialesDisponibles = await prisma.credenciales.findMany({
      where: {
        asignadas: false,
        activas: true
      },
      include: { servicio: true }
    });

    console.log(`   Total credenciales disponibles: ${credencialesDisponibles.length}`);
    credencialesDisponibles.slice(0, 5).forEach(cred => {
      console.log(`   - ${cred.usuario} para ${cred.servicio.nombre}`);
    });

    // 6. Resumen de problemas
    console.log('\n6. RESUMEN DE PROBLEMAS DETECTADOS:');
    
    const problemas = [];
    
    if (pagoReciente.carrito.length === 0) {
      problemas.push('❌ El pago no tiene carrito asociado');
    }
    
    if (suscripciones.length === 0) {
      problemas.push('❌ No se crearon suscripciones para este pago');
    }
    
    if (carritosActivos.length > 0) {
      problemas.push(`⚠️  El cliente tiene ${carritosActivos.length} carritos activos con pagos completados`);
    }
    
    if (pagoReciente.qr.length > 0 && pagoReciente.qr[0].estado === 'ACTIVO') {
      problemas.push('⚠️  El QR está activo pero el pago ya está completado (inconsistencia)');
    }
    
    if (problemas.length === 0) {
      console.log('   ✅ No se detectaron problemas');
    } else {
      problemas.forEach(problema => console.log(`   ${problema}`));
    }

  } catch (error) {
    console.error('❌ Error en debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugProcesoCompleto();