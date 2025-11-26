const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanPaymentMethods() {
  try {
    console.log('🧹 Limpiando métodos de pago duplicados...');
    
    // Obtener todos los métodos de pago agrupados por tipo
    const allMethods = await prisma.metodoPago.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`Total métodos encontrados: ${allMethods.length}`);
    
    // Agrupar por tipo y mantener solo el primero de cada tipo
    const methodsByType = {};
    const toDelete = [];
    
    allMethods.forEach(method => {
      if (!methodsByType[method.tipo]) {
        methodsByType[method.tipo] = method;
        console.log(`Manteniendo: ${method.nombre} (${method.tipo}) - ID: ${method.id}`);
      } else {
        toDelete.push(method.id);
        console.log(`Marcando para eliminar: ${method.nombre} (${method.tipo}) - ID: ${method.id}`);
      }
    });
    
    console.log(`Métodos a eliminar: ${toDelete.length}`);
    
    // Eliminar los duplicados uno por uno
    for (const id of toDelete) {
      try {
        await prisma.metodoPago.delete({
          where: { id }
        });
        console.log(`✅ Eliminado método con ID: ${id}`);
      } catch (error) {
        console.log(`❌ No se pudo eliminar método con ID: ${id} - ${error.message}`);
      }
    }
    
    // Verificar resultado final
    const finalMethods = await prisma.metodoPago.findMany();
    console.log('\n📋 Métodos de pago finales:');
    finalMethods.forEach((method, index) => {
      console.log(`${index + 1}. ${method.nombre} (${method.tipo})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanPaymentMethods();