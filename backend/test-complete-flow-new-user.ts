import { PrismaClient } from '@prisma/client';
import * as bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function testCompleteFlowNewUser() {
  try {
    console.log('🚀 Iniciando prueba de flujo completo para nuevo usuario...\n');

    // 1. CREAR NUEVO USUARIO
    console.log('👤 Paso 1: Creando nuevo usuario...');
    
    const email = `test-${Date.now()}@example.com`;
    const password = 'password123';
    const hashedPassword = await bcryptjs.hash(password, 10);
    
    const cliente = await prisma.cliente.create({
      data: {
        nombre: 'Usuario Test',
        email,
        password: hashedPassword,
        telefono: '+1234567890',
        activo: true
      }
    });
    
    const clienteId = cliente.id;
    console.log(`✅ Usuario creado: ${cliente.nombre} (${cliente.email})`);

    // 2. OBTENER SERVICIOS DISPONIBLES
    console.log('\n🛍️ Paso 2: Obteniendo servicios disponibles...');
    
    const servicios = await prisma.servicio.findMany({
      where: { disponible: true },
      take: 2 // Tomamos 2 servicios para la prueba
    });
    
    if (servicios.length === 0) {
      throw new Error('No hay servicios disponibles para la prueba');
    }
    
    console.log(`✅ Encontrados ${servicios.length} servicios disponibles`);

    // 3. AGREGAR SERVICIOS AL CARRITO
    console.log('\n🛒 Paso 3: Agregando servicios al carrito...');
    
    // Crear carrito
    const carrito = await prisma.carrito.create({
      data: {
        clienteId,
        activo: true
      }
    });
    
    const carritoId = carrito.id;
    
    // Agregar items al carrito
    for (const servicio of servicios) {
      await prisma.carritoItem.create({
        data: {
          carritoId,
          servicioId: servicio.id,
          cantidad: 1,
          precio: servicio.precio
        }
      });
    }
    
    // Verificar carrito con items
    const carritoConItems = await prisma.carrito.findUnique({
      where: { id: carritoId },
      include: {
        items: {
          include: {
            servicio: true
          }
        }
      }
    });
    
    const totalCarrito = carritoConItems!.items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    console.log(`✅ Carrito configurado con ${carritoConItems!.items.length} items, total: $${totalCarrito}`);

    // 4. OBTENER MÉTODO DE PAGO QR
    console.log('\n💳 Paso 4: Obteniendo método de pago QR...');
    
    let metodoPagoQR = await prisma.metodoPago.findFirst({
      where: { tipo: 'QR' }
    });

    if (!metodoPagoQR) {
      metodoPagoQR = await prisma.metodoPago.create({
        data: {
          nombre: 'Pago QR',
          tipo: 'QR',
          descripcion: 'Pago por código QR',
          disponible: true
        }
      });
      console.log('✅ Método de pago QR creado');
    } else {
      console.log('✅ Método de pago QR encontrado');
    }

    // 5. SIMULAR PAGO POR QR (CREAR PAGO PENDIENTE)
    console.log('\n💳 Paso 5: Simulando pago por QR...');
    
    const pago = await prisma.pago.create({
      data: {
        clienteId,
        carritoId,
        monto: totalCarrito,
        estado: 'PENDIENTE',
        referencia: `QR-${Date.now()}`,
        descripcion: 'Pago por QR - Prueba completa',
        metodoPagoId: metodoPagoQR.id
      }
    });

    const pagoId = pago.id;
    console.log('✅ Pago QR creado:', {
      id: pago.id,
      monto: pago.monto,
      estado: pago.estado,
      referencia: pago.referencia
    });

    // 6. VERIFICAR ESTADO INICIAL
    console.log('\n📊 Paso 6: Verificando estado inicial...');
    
    const estadoInicial = await verificarEstadoUsuario(clienteId);
    console.log('Estado inicial del usuario:');
    console.log(`  - Carritos activos: ${estadoInicial.carritosActivos}`);
    console.log(`  - Suscripciones: ${estadoInicial.suscripciones}`);
    console.log(`  - Credenciales: ${estadoInicial.credenciales}`);
    console.log(`  - Pagos completados: ${estadoInicial.pagosCompletados}`);

    // 7. MARCAR PAGO COMO COMPLETADO (SIMULAR CONFIRMACIÓN QR)
    console.log('\n✅ Paso 7: Marcando pago como COMPLETADO...');
    
    const pagoCompletado = await prisma.pago.update({
      where: { id: pagoId },
      data: { estado: 'COMPLETADO' }
    });

    console.log('✅ Pago marcado como COMPLETADO:', pagoCompletado.estado);

    // 8. SIMULAR PROCESAMIENTO AUTOMÁTICO
    console.log('\n⚙️ Paso 8: Simulando procesamiento automático...');
    
    // Crear suscripciones para cada servicio
    for (const item of carritoConItems!.items) {
      const suscripcion = await prisma.suscripcion.create({
        data: {
          clienteId,
          servicioId: item.servicioId,
          estado: 'ACTIVA',
          fechaInicio: new Date(),
          fechaFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
        }
      });

      // Asignar credenciales
      console.log(`🔍 Buscando credenciales para servicio ID: ${item.servicioId} (${item.servicio.nombre})`);
      
      const credencialesDisponibles = await prisma.credenciales.findMany({
        where: {
          servicioId: item.servicioId,
          asignadas: false,
          activas: true
        },
        take: 1
      });

      console.log(`📊 Credenciales encontradas: ${credencialesDisponibles.length}`);
      
      if (credencialesDisponibles.length > 0) {
        await prisma.credenciales.update({
          where: { id: credencialesDisponibles[0].id },
          data: {
            asignadas: true,
            clienteId,
            suscripcionId: suscripcion.id
          }
        });
        console.log(`✅ Credenciales asignadas para servicio: ${item.servicio.nombre}`);
      } else {
        // Debug adicional
        const totalCredencialesServicio = await prisma.credenciales.count({
          where: { servicioId: item.servicioId }
        });
        const credencialesAsignadas = await prisma.credenciales.count({
          where: { servicioId: item.servicioId, asignadas: true }
        });
        const credencialesInactivas = await prisma.credenciales.count({
          where: { servicioId: item.servicioId, activas: false }
        });
        
        console.log(`⚠️ No hay credenciales disponibles para: ${item.servicio.nombre}`);
        console.log(`   📊 Total credenciales: ${totalCredencialesServicio}`);
        console.log(`   👤 Asignadas: ${credencialesAsignadas}`);
        console.log(`   ❌ Inactivas: ${credencialesInactivas}`);
      }
    }

    // Vaciar carrito
    await prisma.carritoItem.deleteMany({
      where: { carritoId }
    });

    await prisma.carrito.update({
      where: { id: carritoId },
      data: { activo: false }
    });

    console.log('✅ Procesamiento automático completado');

    // 9. VERIFICAR ESTADO FINAL
    console.log('\n📊 Paso 9: Verificando estado final...');
    
    const estadoFinal = await verificarEstadoUsuario(clienteId);
    console.log('Estado final del usuario:');
    console.log(`  - Carritos activos: ${estadoFinal.carritosActivos}`);
    console.log(`  - Suscripciones: ${estadoFinal.suscripciones}`);
    console.log(`  - Credenciales: ${estadoFinal.credenciales}`);
    console.log(`  - Pagos completados: ${estadoFinal.pagosCompletados}`);

    // 10. VERIFICAR CARRITO SE VACIÓ
    console.log('\n🛒 Paso 10: Verificando que el carrito se vació...');
    
    const carritoFinal = await prisma.carrito.findUnique({
      where: { id: carritoId },
      include: {
        items: true
      }
    });

    if (!carritoFinal?.activo) {
      console.log('✅ ÉXITO: El carrito se desactivó correctamente');
    } else {
      console.log('❌ ERROR: El carrito sigue activo');
    }

    if (carritoFinal?.items.length === 0) {
      console.log('✅ ÉXITO: El carrito se vació correctamente');
    } else {
      console.log(`❌ ERROR: El carrito aún tiene ${carritoFinal?.items.length} items`);
    }

    // 11. VERIFICAR CREDENCIALES ASIGNADAS
    console.log('\n🔑 Paso 11: Verificando credenciales asignadas...');
    
    const credenciales = await prisma.credenciales.findMany({
      where: {
        clienteId,
        asignadas: true,
        activas: true
      },
      include: {
        servicio: true,
        suscripcion: true
      }
    });

    console.log(`✅ Credenciales asignadas: ${credenciales.length}`);
    credenciales.forEach((cred, index) => {
      console.log(`  ${index + 1}. Servicio: ${cred.servicio.nombre}`);
      console.log(`     Usuario: ${cred.usuario}`);
      console.log(`     Estado: ${cred.activas ? 'Activa' : 'Inactiva'}`);
    });

    // 12. RESUMEN FINAL
    console.log('\n📋 RESUMEN FINAL:');
    console.log('================');
    console.log(`✅ Usuario creado: ${cliente.email}`);
    console.log(`✅ Servicios agregados al carrito: ${servicios.length}`);
    console.log(`✅ Pago QR procesado: $${totalCarrito}`);
    console.log(`✅ Carrito vaciado: ${!carritoFinal?.activo ? 'SÍ' : 'NO'}`);
    console.log(`✅ Suscripciones creadas: ${estadoFinal.suscripciones}`);
    console.log(`✅ Credenciales asignadas: ${credenciales.length}`);
    
    const exito = !carritoFinal?.activo && 
                  carritoFinal?.items.length === 0 && 
                  estadoFinal.suscripciones > 0 && 
                  credenciales.length > 0;
    
    console.log(`\n🎯 RESULTADO: ${exito ? '✅ ÉXITO COMPLETO' : '❌ FALLÓ ALGUNA VERIFICACIÓN'}`);

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function verificarEstadoUsuario(clienteId: string) {
  const carritosActivos = await prisma.carrito.count({
    where: { clienteId, activo: true }
  });

  const suscripciones = await prisma.suscripcion.count({
    where: { clienteId, estado: 'ACTIVA' }
  });

  const credenciales = await prisma.credenciales.count({
    where: { clienteId, asignadas: true, activas: true }
  });

  const pagosCompletados = await prisma.pago.count({
    where: { clienteId, estado: 'COMPLETADO' }
  });

  return {
    carritosActivos,
    suscripciones,
    credenciales,
    pagosCompletados
  };
}

testCompleteFlowNewUser();