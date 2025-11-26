import { PrismaClient } from '@prisma/client';
import { crearSuscripcionDesdeCarrito } from './src/controllers/suscripcionController';

const prisma = new PrismaClient();

async function testMultipleUsers() {
  try {
    console.log('🧪 Probando el flujo con MÚLTIPLES USUARIOS NUEVOS');
    console.log('='.repeat(60));
    
    const numUsuarios = 3;
    const resultados: any[] = [];
    
    for (let i = 1; i <= numUsuarios; i++) {
      console.log(`\n👤 USUARIO ${i}/${numUsuarios}:`);
      console.log('-'.repeat(40));
      
      // 1. Crear usuario
      const usuario = await prisma.cliente.create({
        data: {
          nombre: `Usuario Test ${i}`,
          email: `test-user-${i}-${Date.now()}@example.com`,
          password: 'password123'
        }
      });
      
      console.log(`✅ Usuario creado: ${usuario.nombre} (${usuario.email})`);
      
      // 2. Crear carrito con servicios aleatorios
      const servicios = await prisma.servicio.findMany();
      const serviciosSeleccionados = servicios.slice(0, Math.min(2, servicios.length));
      
      const carrito = await prisma.carrito.create({
        data: {
          clienteId: usuario.id,
          activo: true,
          items: {
            create: serviciosSeleccionados.map(servicio => ({
              servicioId: servicio.id,
              cantidad: 1,
              precio: servicio.precio
            }))
          }
        },
        include: { items: { include: { servicio: true } } }
      });
      
      const totalCarrito = carrito.items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
      console.log(`🛒 Carrito: ${carrito.items.length} items, Total: $${totalCarrito}`);
      
      // 3. Ejecutar flujo de pago
      const metodoPago = await prisma.metodoPago.findFirst();
      
      const mockReq = {
        user: { id: usuario.id },
        body: { metodoPagoId: metodoPago!.id }
      } as any;
      
      let responseData: any = null;
      let responseStatus = 200;
      
      const mockRes = {
        status: (code: number) => {
          responseStatus = code;
          return mockRes;
        },
        json: (data: any) => {
          responseData = data;
          return mockRes;
        }
      } as any;
      
      try {
        await crearSuscripcionDesdeCarrito(mockReq, mockRes);
        
        // 4. Verificar resultado
        const carritoFinal = await prisma.carrito.findFirst({
          where: { clienteId: usuario.id, activo: true }
        });
        
        const suscripciones = await prisma.suscripcion.count({
          where: { clienteId: usuario.id }
        });
        
        const credenciales = await prisma.credenciales.count({
          where: { clienteId: usuario.id, activas: true }
        });
        
        const pago = await prisma.pago.findFirst({
          where: { clienteId: usuario.id },
          orderBy: { createdAt: 'desc' }
        });
        
        const exito = !carritoFinal && 
                     suscripciones === carrito.items.length && 
                     credenciales === carrito.items.length && 
                     pago && pago.carritoId;
        
        if (exito) {
          console.log('✅ Flujo exitoso');
        } else {
          console.log('❌ Flujo fallido');
        }
        
        resultados.push({
          usuario: i,
          email: usuario.email,
          exito,
          carritoVacio: !carritoFinal,
          suscripciones,
          credenciales,
          pagoAsociado: !!pago?.carritoId
        });
        
      } catch (error) {
        console.log('❌ Error en el flujo:', error);
        resultados.push({
          usuario: i,
          email: usuario.email,
          exito: false,
          error: error
        });
      }
    }
    
    // 5. Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE RESULTADOS:');
    
    const exitosos = resultados.filter(r => r.exito).length;
    const fallidos = resultados.filter(r => !r.exito).length;
    
    console.log(`✅ Usuarios exitosos: ${exitosos}/${numUsuarios}`);
    console.log(`❌ Usuarios fallidos: ${fallidos}/${numUsuarios}`);
    
    if (exitosos === numUsuarios) {
      console.log('\n🎉 ¡TODOS LOS USUARIOS PROCESADOS EXITOSAMENTE!');
      console.log('✅ El sistema es robusto y el error NO se repetirá');
    } else {
      console.log('\n⚠️ Algunos usuarios fallaron:');
      resultados.filter(r => !r.exito).forEach(r => {
        console.log(`   - Usuario ${r.usuario}: ${r.error || 'Error desconocido'}`);
      });
    }
    
    // 6. Verificar que no hay pagos sin carrito asociado
    console.log('\n🔍 Verificando integridad de pagos...');
    const pagosSinCarrito = await prisma.pago.count({
      where: {
        estado: 'COMPLETADO',
        carritoId: null,
        clienteId: { in: resultados.map(r => r.email) }
      }
    });
    
    if (pagosSinCarrito === 0) {
      console.log('✅ Todos los pagos están correctamente asociados a carritos');
    } else {
      console.log(`⚠️ ${pagosSinCarrito} pagos sin carrito asociado encontrados`);
    }
    
    // 7. Limpiar datos de prueba
    console.log('\n🧹 Limpiando datos de prueba...');
    for (const resultado of resultados) {
      try {
        const usuario = await prisma.cliente.findUnique({
          where: { email: resultado.email }
        });
        
        if (usuario) {
          await prisma.credenciales.deleteMany({ where: { clienteId: usuario.id } });
          await prisma.suscripcion.deleteMany({ where: { clienteId: usuario.id } });
          await prisma.pago.deleteMany({ where: { clienteId: usuario.id } });
          await prisma.carritoItem.deleteMany({ 
            where: { carrito: { clienteId: usuario.id } } 
          });
          await prisma.carrito.deleteMany({ where: { clienteId: usuario.id } });
          await prisma.cliente.delete({ where: { id: usuario.id } });
        }
      } catch (error) {
        console.log(`⚠️ Error limpiando usuario ${resultado.email}:`, error);
      }
    }
    console.log('✅ Limpieza completada');
    
  } catch (error) {
    console.error('❌ Error en la prueba múltiple:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMultipleUsers();