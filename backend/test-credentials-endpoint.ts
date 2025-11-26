import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCredentialsEndpoint() {
  console.log('🔍 Probando endpoint de credenciales para benja@gmail.com...\n');

  try {
    // 1. Buscar el cliente benja@gmail.com
    const cliente = await prisma.cliente.findUnique({
      where: { email: 'benja@gmail.com' }
    });

    if (!cliente) {
      console.log('❌ Cliente benja@gmail.com no encontrado');
      return;
    }

    console.log('✅ Cliente encontrado:', {
      id: cliente.id,
      nombre: cliente.nombre,
      email: cliente.email
    });

    // 2. Simular la consulta del endpoint /credenciales/mis-credenciales
    console.log('\n📡 Simulando consulta del endpoint...');
    
    const credenciales = await prisma.credenciales.findMany({
      where: {
        clienteId: cliente.id,
        activas: true,
        asignadas: true
      },
      include: {
        servicio: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            categoria: true
          }
        },
        suscripcion: {
          select: {
            id: true,
            estado: true,
            fechaInicio: true,
            fechaFin: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`\n📊 Resultado del endpoint:`);
    console.log(`Total de credenciales encontradas: ${credenciales.length}`);

    if (credenciales.length === 0) {
      console.log('❌ No se encontraron credenciales para este cliente');
      
      // Verificar si hay credenciales pero con diferentes filtros
      console.log('\n🔍 Verificando credenciales con diferentes filtros...');
      
      const todasCredenciales = await prisma.credenciales.findMany({
        where: { clienteId: cliente.id },
        include: {
          servicio: { select: { nombre: true } },
          suscripcion: { select: { estado: true } }
        }
      });
      
      console.log(`Total de credenciales (sin filtros): ${todasCredenciales.length}`);
      
      todasCredenciales.forEach((cred, index) => {
        console.log(`  ${index + 1}. Servicio: ${cred.servicio.nombre}`);
        console.log(`     - Activas: ${cred.activas}`);
        console.log(`     - Asignadas: ${cred.asignadas}`);
        console.log(`     - Suscripción estado: ${cred.suscripcion?.estado || 'Sin suscripción'}`);
      });
    } else {
      console.log('\n✅ Credenciales encontradas:');
      
      credenciales.forEach((cred, index) => {
        console.log(`\n  ${index + 1}. ${cred.servicio.nombre}`);
        console.log(`     - ID: ${cred.id}`);
        console.log(`     - Usuario: ${cred.usuario}`);
        console.log(`     - Activas: ${cred.activas}`);
        console.log(`     - Asignadas: ${cred.asignadas}`);
        console.log(`     - Suscripción: ${cred.suscripcion?.estado || 'Sin suscripción'} (${cred.suscripcion?.fechaInicio || 'N/A'} - ${cred.suscripcion?.fechaFin || 'N/A'})`);
        console.log(`     - Categoría: ${cred.servicio.categoria}`);
      });
    }

    // 3. Verificar suscripciones activas
    console.log('\n📋 Verificando suscripciones del cliente...');
    
    const suscripciones = await prisma.suscripcion.findMany({
      where: { clienteId: cliente.id },
      include: {
        servicio: { select: { nombre: true } },
        credenciales: { select: { id: true, activas: true, asignadas: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Total de suscripciones: ${suscripciones.length}`);
    
    suscripciones.forEach((sub, index) => {
      console.log(`\n  ${index + 1}. ${sub.servicio.nombre}`);
      console.log(`     - Estado: ${sub.estado}`);
      console.log(`     - Fecha inicio: ${sub.fechaInicio}`);
      console.log(`     - Fecha fin: ${sub.fechaFin}`);
      console.log(`     - Credenciales asociadas: ${sub.credenciales.length}`);
      
      sub.credenciales.forEach((cred, credIndex) => {
        console.log(`       ${credIndex + 1}. ID: ${cred.id}, Activas: ${cred.activas}, Asignadas: ${cred.asignadas}`);
      });
    });

    // 4. Diagnóstico del problema
    console.log('\n🔧 Diagnóstico del problema:');
    
    if (credenciales.length === 0 && suscripciones.length > 0) {
      console.log('❌ PROBLEMA IDENTIFICADO: Hay suscripciones pero no credenciales que cumplan los filtros del endpoint');
      console.log('   - El endpoint busca credenciales con: activas=true Y asignadas=true');
      console.log('   - Verificar si las credenciales tienen estos campos correctamente configurados');
    } else if (credenciales.length > 0) {
      console.log('✅ Las credenciales se obtienen correctamente del endpoint');
      console.log('   - El problema puede estar en el frontend o en la autenticación');
    } else {
      console.log('❌ No hay suscripciones ni credenciales para este cliente');
    }

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCredentialsEndpoint();