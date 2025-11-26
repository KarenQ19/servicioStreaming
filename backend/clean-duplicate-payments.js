const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanDuplicatePayments() {
  try {
    console.log('🔍 Analizando pagos duplicados...');

    // Buscar pagos que podrían ser duplicados
    // Agrupamos por clienteId, monto, metodoPagoId y fecha (mismo día)
    const pagos = await prisma.pago.findMany({
      select: {
        id: true,
        clienteId: true,
        monto: true,
        metodoPagoId: true,
        estado: true,
        referencia: true,
        descripcion: true,
        createdAt: true,
        carritoId: true,
        suscripcionId: true,
        cliente: {
          select: {
            nombre: true,
            email: true
          }
        },
        metodoPago: {
          select: {
            nombre: true,
            tipo: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Total de pagos encontrados: ${pagos.length}`);

    // Agrupar pagos potencialmente duplicados
    const grupos = {};
    
    pagos.forEach(pago => {
      // Crear una clave única basada en cliente, monto, método y día
      const fecha = pago.createdAt.toISOString().split('T')[0]; // Solo la fecha, sin hora
      const clave = `${pago.clienteId}-${pago.monto}-${pago.metodoPagoId}-${fecha}`;
      
      if (!grupos[clave]) {
        grupos[clave] = [];
      }
      grupos[clave].push(pago);
    });

    // Identificar grupos con duplicados
    const gruposDuplicados = Object.entries(grupos).filter(([clave, pagos]) => pagos.length > 1);
    
    console.log(`🔍 Grupos con posibles duplicados: ${gruposDuplicados.length}`);

    let totalEliminados = 0;
    let montoRecuperado = 0;

    for (const [clave, pagosDuplicados] of gruposDuplicados) {
      console.log(`\n📋 Grupo: ${clave}`);
      console.log(`   Cliente: ${pagosDuplicados[0].cliente.nombre} (${pagosDuplicados[0].cliente.email})`);
      console.log(`   Método: ${pagosDuplicados[0].metodoPago.nombre}`);
      console.log(`   Monto: $${pagosDuplicados[0].monto}`);
      console.log(`   Cantidad de duplicados: ${pagosDuplicados.length}`);

      // Mostrar todos los pagos del grupo
      pagosDuplicados.forEach((pago, index) => {
        console.log(`     ${index + 1}. ID: ${pago.id}, Estado: ${pago.estado}, Ref: ${pago.referencia}, Fecha: ${pago.createdAt.toISOString()}`);
      });

      // Mantener el más reciente (primer elemento ya que están ordenados por fecha desc)
      const pagoAMantener = pagosDuplicados[0];
      const pagosAEliminar = pagosDuplicados.slice(1);

      console.log(`   ✅ Manteniendo: ${pagoAMantener.id} (más reciente)`);
      console.log(`   ❌ Eliminando: ${pagosAEliminar.length} pago(s) duplicado(s)`);

      // Eliminar los pagos duplicados
      for (const pagoAEliminar of pagosAEliminar) {
        try {
          // Verificar si hay QRs asociados y eliminarlos primero
          const qrsAsociados = await prisma.qR.findMany({
            where: { pagoId: pagoAEliminar.id }
          });

          if (qrsAsociados.length > 0) {
            await prisma.qR.deleteMany({
              where: { pagoId: pagoAEliminar.id }
            });
            console.log(`     🗑️ Eliminados ${qrsAsociados.length} QR(s) asociado(s)`);
          }

          // Eliminar el pago
          await prisma.pago.delete({
            where: { id: pagoAEliminar.id }
          });

          totalEliminados++;
          montoRecuperado += parseFloat(pagoAEliminar.monto.toString());
          console.log(`     ✅ Pago ${pagoAEliminar.id} eliminado exitosamente`);
        } catch (error) {
          console.log(`     ❌ Error al eliminar pago ${pagoAEliminar.id}:`, error.message);
        }
      }
    }

    console.log(`\n📊 RESUMEN DE LIMPIEZA:`);
    console.log(`   Pagos duplicados eliminados: ${totalEliminados}`);
    console.log(`   Monto total recuperado: $${montoRecuperado.toFixed(2)}`);
    console.log(`   Grupos de duplicados procesados: ${gruposDuplicados.length}`);

    // Mostrar estadísticas finales
    const pagosFinales = await prisma.pago.count();
    console.log(`   Pagos restantes en la base de datos: ${pagosFinales}`);

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDuplicatePayments();