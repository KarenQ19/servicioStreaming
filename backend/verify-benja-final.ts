import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyBenjaFinalState() {
  try {
    console.log('🔍 Verificación final del estado del usuario benja@gmail.com');
    console.log('='.repeat(60));
    
    // 1. Buscar el usuario
    const usuario = await prisma.cliente.findUnique({
      where: { email: 'benja@gmail.com' }
    });
    
    if (!usuario) {
      console.log('❌ Usuario benja@gmail.com no encontrado');
      return;
    }
    
    console.log(`✅ Usuario: ${usuario.nombre} (${usuario.email})`);
    console.log(`   ID: ${usuario.id}`);
    
    // 2. Verificar carritos
    console.log('\n🛒 CARRITOS:');
    const carritos = await prisma.carrito.findMany({
      where: { clienteId: usuario.id },
      include: { items: { include: { servicio: true } } },
      orderBy: { createdAt: 'desc' }
    });
    
    const carritoActivo = carritos.find(c => c.activo);
    
    if (carritoActivo) {
      console.log(`   ⚠️ Carrito activo encontrado con ${carritoActivo.items.length} items:`);
      carritoActivo.items.forEach(item => {
        console.log(`      - ${item.servicio.nombre}: $${item.precio} x ${item.cantidad}`);
      });
    } else {
      console.log('   ✅ No hay carritos activos (correcto después del pago)');
    }
    
    console.log(`   📊 Total de carritos: ${carritos.length}`);
    
    // 3. Verificar suscripciones
    console.log('\n📋 SUSCRIPCIONES:');
    const suscripciones = await prisma.suscripcion.findMany({
      where: { clienteId: usuario.id },
      include: { servicio: true },
      orderBy: { createdAt: 'desc' }
    });
    
    if (suscripciones.length > 0) {
      console.log(`   ✅ ${suscripciones.length} suscripciones encontradas:`);
      suscripciones.forEach((sub, index) => {
        console.log(`   ${index + 1}. ${sub.servicio.nombre} - Estado: ${sub.estado}`);
        console.log(`      Fecha inicio: ${sub.fechaInicio.toISOString()}`);
        console.log(`      Fecha fin: ${sub.fechaFin.toISOString()}`);
      });
    } else {
      console.log('   ❌ No hay suscripciones');
    }
    
    // 4. Verificar credenciales
    console.log('\n🔑 CREDENCIALES:');
    const credenciales = await prisma.credenciales.findMany({
      where: { clienteId: usuario.id },
      include: { servicio: true, suscripcion: true },
      orderBy: { createdAt: 'desc' }
    });
    
    if (credenciales.length > 0) {
      console.log(`   ✅ ${credenciales.length} credenciales encontradas:`);
      credenciales.forEach((cred, index) => {
        console.log(`   ${index + 1}. Servicio: ${cred.servicio.nombre}`);
        console.log(`      Usuario: ${cred.usuario} | Password: ${cred.password}`);
        console.log(`      Activas: ${cred.activas} | Asignadas: ${cred.asignadas}`);
        console.log(`      Suscripción ID: ${cred.suscripcionId}`);
      });
    } else {
      console.log('   ❌ No hay credenciales');
    }
    
    // 5. Verificar pagos
    console.log('\n💳 PAGOS:');
    const pagos = await prisma.pago.findMany({
      where: { clienteId: usuario.id },
      include: { metodoPago: true },
      orderBy: { createdAt: 'desc' }
    });
    
    if (pagos.length > 0) {
      console.log(`   📊 ${pagos.length} pagos encontrados:`);
      pagos.forEach((pago, index) => {
        console.log(`   ${index + 1}. $${pago.monto} - Estado: ${pago.estado}`);
        console.log(`      Referencia: ${pago.referencia}`);
        console.log(`      Método: ${pago.metodoPago.nombre}`);
        console.log(`      Fecha: ${pago.createdAt.toISOString()}`);
        console.log(`      Carrito ID: ${pago.carritoId || 'No asociado'}`);
      });
      
      // Verificar pagos completados sin procesar
      const pagosCompletadosSinProcesar = pagos.filter(p => 
        p.estado === 'COMPLETADO' && !p.carritoId
      );
      
      if (pagosCompletadosSinProcesar.length > 0) {
        console.log(`   ⚠️ ${pagosCompletadosSinProcesar.length} pagos completados sin carrito asociado`);
      } else {
        console.log('   ✅ Todos los pagos completados están correctamente asociados');
      }
    } else {
      console.log('   ❌ No hay pagos');
    }
    
    // 6. Calcular gastos
    console.log('\n💰 GASTOS:');
    const totalGastado = pagos
      .filter(p => p.estado === 'COMPLETADO')
      .reduce((sum, p) => sum + p.monto, 0);
    
    console.log(`   💵 Total gastado: $${totalGastado}`);
    
    // Gasto mensual (último mes)
    const fechaUnMesAtras = new Date();
    fechaUnMesAtras.setMonth(fechaUnMesAtras.getMonth() - 1);
    
    const gastoMensual = pagos
      .filter(p => p.estado === 'COMPLETADO' && p.createdAt >= fechaUnMesAtras)
      .reduce((sum, p) => sum + p.monto, 0);
    
    console.log(`   📅 Gasto mensual: $${gastoMensual}`);
    
    // 7. Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📋 RESUMEN FINAL:');
    console.log(`✅ Usuario: ${usuario.nombre} (${usuario.email})`);
    console.log(`🛒 Carrito activo: ${carritoActivo ? 'SÍ (⚠️ problema)' : 'NO (✅ correcto)'}`);
    console.log(`📋 Suscripciones: ${suscripciones.length}`);
    console.log(`🔑 Credenciales: ${credenciales.length}`);
    console.log(`💳 Pagos: ${pagos.length} (${pagos.filter(p => p.estado === 'COMPLETADO').length} completados)`);
    console.log(`💰 Total gastado: $${totalGastado}`);
    console.log(`📅 Gasto mensual: $${gastoMensual}`);
    
    // Verificar si todo está funcionando correctamente
    const todoFunciona = !carritoActivo && 
                        suscripciones.length > 0 && 
                        credenciales.length > 0 && 
                        pagos.some(p => p.estado === 'COMPLETADO');
    
    if (todoFunciona) {
      console.log('\n🎉 ¡TODO FUNCIONA CORRECTAMENTE!');
      console.log('   - El carrito se vació después del pago');
      console.log('   - Se crearon las suscripciones');
      console.log('   - Se asignaron las credenciales');
      console.log('   - Los pagos se procesaron correctamente');
    } else {
      console.log('\n⚠️ Hay algunos problemas que revisar:');
      if (carritoActivo) console.log('   - El carrito sigue activo');
      if (suscripciones.length === 0) console.log('   - No hay suscripciones');
      if (credenciales.length === 0) console.log('   - No hay credenciales');
      if (!pagos.some(p => p.estado === 'COMPLETADO')) console.log('   - No hay pagos completados');
    }
    
  } catch (error) {
    console.error('❌ Error en la verificación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyBenjaFinalState();