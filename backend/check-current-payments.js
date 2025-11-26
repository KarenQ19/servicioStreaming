const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPayments() {
  try {
    const pagos = await prisma.pago.findMany({
      include: {
        cliente: true,
        metodoPago: true,
        carrito: {
          include: {
            items: {
              include: {
                servicio: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('=== PAGOS ACTUALES ===');
    pagos.forEach(pago => {
      console.log(`ID: ${pago.id}`);
      console.log(`Cliente: ${pago.cliente.nombre} (${pago.cliente.email})`);
      console.log(`Monto: $${pago.monto}`);
      console.log(`Estado: ${pago.estado}`);
      console.log(`Método: ${pago.metodoPago.nombre}`);
      console.log(`Descripción: ${pago.descripcion}`);
      console.log(`Fecha: ${pago.createdAt}`);
      if (pago.carrito && pago.carrito.items) {
        console.log(`Items del carrito: ${pago.carrito.items.length}`);
        pago.carrito.items.forEach(item => {
          console.log(`  - ${item.servicio.nombre}: $${item.precio}`);
        });
      }
      console.log('---');
    });
    
    // Buscar duplicados por cliente, monto y fecha (mismo día)
    const duplicados = {};
    pagos.forEach(pago => {
      const fechaStr = pago.createdAt.toDateString();
      const key = `${pago.clienteId}-${pago.monto}-${pago.metodoPagoId}-${fechaStr}`;
      if (!duplicados[key]) {
        duplicados[key] = [];
      }
      duplicados[key].push(pago);
    });
    
    console.log('\n=== DUPLICADOS DETECTADOS ===');
    let hasDuplicados = false;
    Object.entries(duplicados).forEach(([key, pagosGroup]) => {
      if (pagosGroup.length > 1) {
        hasDuplicados = true;
        console.log(`Grupo duplicado: ${pagosGroup.length} pagos`);
        pagosGroup.forEach(pago => {
          console.log(`  - ID: ${pago.id}, Monto: $${pago.monto}, Fecha: ${pago.createdAt}`);
        });
        console.log('');
      }
    });
    
    if (!hasDuplicados) {
      console.log('No se encontraron duplicados.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPayments();