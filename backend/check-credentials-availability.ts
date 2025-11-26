import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCredentialsAvailability() {
  try {
    console.log('🔍 Verificando disponibilidad de credenciales en la base de datos...\n');

    // 1. OBTENER TODOS LOS SERVICIOS
    const servicios = await prisma.servicio.findMany({
      where: { disponible: true },
      select: {
        id: true,
        nombre: true,
        categoria: true,
        precio: true
      }
    });

    console.log(`📦 Servicios disponibles: ${servicios.length}`);
    servicios.forEach((servicio, index) => {
      console.log(`  ${index + 1}. ${servicio.nombre} (${servicio.categoria}) - $${servicio.precio}`);
    });

    // 2. VERIFICAR CREDENCIALES POR SERVICIO
    console.log('\n🔑 Verificando credenciales por servicio:');
    console.log('=====================================');

    for (const servicio of servicios) {
      console.log(`\n📋 Servicio: ${servicio.nombre}`);
      
      // Credenciales totales
      const totalCredenciales = await prisma.credenciales.count({
        where: { servicioId: servicio.id }
      });

      // Credenciales disponibles (no asignadas y activas)
      const credencialesDisponibles = await prisma.credenciales.count({
        where: {
          servicioId: servicio.id,
          asignadas: false,
          activas: true
        }
      });

      // Credenciales asignadas
      const credencialesAsignadas = await prisma.credenciales.count({
        where: {
          servicioId: servicio.id,
          asignadas: true,
          activas: true
        }
      });

      // Credenciales inactivas
      const credencialesInactivas = await prisma.credenciales.count({
        where: {
          servicioId: servicio.id,
          activas: false
        }
      });

      console.log(`  📊 Total: ${totalCredenciales}`);
      console.log(`  ✅ Disponibles: ${credencialesDisponibles}`);
      console.log(`  👤 Asignadas: ${credencialesAsignadas}`);
      console.log(`  ❌ Inactivas: ${credencialesInactivas}`);

      if (credencialesDisponibles === 0) {
        console.log(`  ⚠️  NO HAY CREDENCIALES DISPONIBLES para ${servicio.nombre}`);
      }

      // Mostrar algunas credenciales de ejemplo si existen
      if (totalCredenciales > 0) {
        const ejemplosCredenciales = await prisma.credenciales.findMany({
          where: { servicioId: servicio.id },
          take: 3,
          select: {
            id: true,
            usuario: true,
            asignadas: true,
            activas: true,
            clienteId: true
          }
        });

        console.log(`  📝 Ejemplos de credenciales:`);
        ejemplosCredenciales.forEach((cred, index) => {
          const estado = cred.asignadas ? 'Asignada' : 'Disponible';
          const activa = cred.activas ? 'Activa' : 'Inactiva';
          console.log(`    ${index + 1}. ${cred.usuario} - ${estado} - ${activa}`);
        });
      }
    }

    // 3. RESUMEN GENERAL
    console.log('\n📋 RESUMEN GENERAL:');
    console.log('==================');

    const totalCredencialesDB = await prisma.credenciales.count();
    const totalDisponibles = await prisma.credenciales.count({
      where: { asignadas: false, activas: true }
    });
    const totalAsignadas = await prisma.credenciales.count({
      where: { asignadas: true, activas: true }
    });

    console.log(`📊 Total credenciales en DB: ${totalCredencialesDB}`);
    console.log(`✅ Total disponibles: ${totalDisponibles}`);
    console.log(`👤 Total asignadas: ${totalAsignadas}`);

    if (totalDisponibles === 0) {
      console.log('\n❌ PROBLEMA IDENTIFICADO: No hay credenciales disponibles');
      console.log('💡 SOLUCIÓN: Necesitas crear credenciales para los servicios');
    } else {
      console.log('\n✅ Hay credenciales disponibles para asignar');
    }

  } catch (error) {
    console.error('❌ Error verificando credenciales:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCredentialsAvailability();