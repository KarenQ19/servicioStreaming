const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testQRPayment() {
  console.log('=== VERIFICANDO PAGOS POR QR ===\n');

  try {
    // 1. Buscar métodos de pago QR
    console.log('1. Métodos de pago QR disponibles:');
    const metodosQR = await prisma.metodoPago.findMany({
      where: {
        tipo: 'QR'
      }
    });
    
    console.log(`   Encontrados: ${metodosQR.length} métodos QR`);
    metodosQR.forEach(metodo => {
      console.log(`   - ${metodo.nombre} (ID: ${metodo.id}) - Disponible: ${metodo.disponible}`);
    });
    console.log('');

    // 2. Buscar pagos que usen métodos QR
    console.log('2. Pagos realizados con QR:');
    const pagosQR = await prisma.pago.findMany({
      where: {
        metodoPago: {
          tipo: 'QR'
        }
      },
      include: {
        metodoPago: true,
        cliente: true,
        qr: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`   Encontrados: ${pagosQR.length} pagos con QR`);
    
    if (pagosQR.length > 0) {
      pagosQR.forEach((pago, index) => {
        console.log(`   ${index + 1}. Pago ID: ${pago.id}`);
        console.log(`      Cliente: ${pago.cliente.email}`);
        console.log(`      Monto: $${pago.monto}`);
        console.log(`      Estado: ${pago.estado}`);
        console.log(`      Método: ${pago.metodoPago.nombre}`);
        console.log(`      Fecha: ${pago.createdAt}`);
        console.log(`      Tiene QR: ${pago.qr ? 'Sí' : 'No'}`);
        if (pago.qr) {
          console.log(`      QR Estado: ${pago.qr.estado}`);
          console.log(`      QR Código: ${pago.qr.codigo}`);
        }
        console.log('');
      });
    } else {
      console.log('   No se encontraron pagos con QR\n');
    }

    // 3. Buscar QRs en la base de datos
    console.log('3. Códigos QR en la base de datos:');
    const qrs = await prisma.qR.findMany({
      include: {
        pago: {
          include: {
            cliente: true,
            metodoPago: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`   Encontrados: ${qrs.length} códigos QR`);
    
    if (qrs.length > 0) {
      qrs.forEach((qr, index) => {
        console.log(`   ${index + 1}. QR ID: ${qr.id}`);
        console.log(`      Código: ${qr.codigo}`);
        console.log(`      Estado: ${qr.estado}`);
        console.log(`      Pago ID: ${qr.pagoId}`);
        console.log(`      Cliente: ${qr.pago.cliente.email}`);
        console.log(`      Monto: $${qr.pago.monto}`);
        console.log(`      Estado Pago: ${qr.pago.estado}`);
        console.log(`      Creado: ${qr.createdAt}`);
        console.log(`      Expira: ${qr.expiresAt}`);
        console.log('');
      });
    } else {
      console.log('   No se encontraron códigos QR\n');
    }

    // 4. Verificar carritos activos con servicios
    console.log('4. Carritos activos para probar:');
    const carritosActivos = await prisma.carrito.findMany({
      where: {
        activo: true
      },
      include: {
        cliente: true,
        items: {
          include: {
            servicio: true
          }
        }
      }
    });

    console.log(`   Encontrados: ${carritosActivos.length} carritos activos`);
    carritosActivos.forEach((carrito, index) => {
      console.log(`   ${index + 1}. Carrito ID: ${carrito.id}`);
      console.log(`      Cliente: ${carrito.cliente.email}`);
      console.log(`      Items: ${carrito.items.length}`);
      carrito.items.forEach(item => {
        console.log(`        - ${item.servicio.nombre}: $${item.servicio.precio}`);
      });
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testQRPayment();