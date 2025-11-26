const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixPaymentMethods() {
  try {
    console.log('🔧 Consolidando métodos de pago duplicados...');
    
    // Obtener todos los métodos de pago ordenados por fecha de creación
    const metodos = await prisma.metodoPago.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`📊 Total métodos encontrados: ${metodos.length}`);
    
    // Agrupar por tipo
    const grupos = {};
    metodos.forEach(metodo => {
      if (!grupos[metodo.tipo]) {
        grupos[metodo.tipo] = [];
      }
      grupos[metodo.tipo].push(metodo);
    });
    
    let consolidados = 0;
    let eliminados = 0;
    
    // Procesar cada tipo
    for (const [tipo, metodosDelTipo] of Object.entries(grupos)) {
      if (metodosDelTipo.length > 1) {
        console.log(`\n📋 Procesando tipo ${tipo}: ${metodosDelTipo.length} métodos`);
        
        // El primero (más antiguo) será el que mantengamos
        const metodoPrincipal = metodosDelTipo[0];
        const metodosAEliminar = metodosDelTipo.slice(1);
        
        console.log(`   ✅ Método principal: ${metodoPrincipal.id} (${metodoPrincipal.nombre})`);
        
        // Para cada método duplicado, mover sus pagos al método principal
        for (const metodoDuplicado of metodosAEliminar) {
          console.log(`   🔄 Procesando duplicado: ${metodoDuplicado.id}`);
          
          // Contar pagos asociados
          const pagosCount = await prisma.pago.count({
            where: { metodoPagoId: metodoDuplicado.id }
          });
          
          if (pagosCount > 0) {
            console.log(`      📦 Moviendo ${pagosCount} pago(s) al método principal`);
            
            // Actualizar todos los pagos para que apunten al método principal
            await prisma.pago.updateMany({
              where: { metodoPagoId: metodoDuplicado.id },
              data: { metodoPagoId: metodoPrincipal.id }
            });
            
            consolidados += pagosCount;
          }
          
          // Ahora eliminar el método duplicado (ya no tiene referencias)
          await prisma.metodoPago.delete({
            where: { id: metodoDuplicado.id }
          });
          
          console.log(`      ❌ Método duplicado eliminado: ${metodoDuplicado.id}`);
          eliminados++;
        }
      }
    }
    
    console.log(`\n📊 RESUMEN:`);
    console.log(`   Pagos consolidados: ${consolidados}`);
    console.log(`   Métodos eliminados: ${eliminados}`);
    
    // Mostrar estado final
    const metodosFinales = await prisma.metodoPago.findMany({
      orderBy: { tipo: 'asc' }
    });
    
    console.log(`\n✅ Métodos de pago finales (${metodosFinales.length}):`);
    console.table(metodosFinales.map(m => ({
      tipo: m.tipo,
      nombre: m.nombre,
      id: m.id.slice(-8),
      disponible: m.disponible
    })));
    
    // Verificar que no hay duplicados
    const tiposUnicos = [...new Set(metodosFinales.map(m => m.tipo))];
    if (tiposUnicos.length === metodosFinales.length) {
      console.log('✅ ¡Perfecto! No hay duplicados restantes.');
      return true;
    } else {
      console.log('⚠️ Aún hay duplicados restantes.');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error durante la consolidación:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

fixPaymentMethods().then(success => {
  if (success) {
    console.log('\n🎉 Consolidación completada exitosamente!');
  } else {
    console.log('\n💥 La consolidación falló.');
  }
});