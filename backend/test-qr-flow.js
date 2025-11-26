const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';

async function testQRFlow() {
  try {
    console.log('🧪 TEST: Probando flujo de QR completo\n');

    // Primero, necesitamos obtener un código QR existente
    console.log('1. Buscando códigos QR existentes...');
    
    // Intentar obtener un QR de los pagos recientes
    const pagosResponse = await axios.get(`${API_URL}/clientes/pagos`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtaGp1bGVqaDAwMGZyeGJmeDhhYnN2dXEiLCJlbWFpbCI6InVzdUBnbWFpbC5jb20iLCJyb2xlIjoiQ0xJRU5URSIsImlhdCI6MTc2MjIxOTU0OH0.jN8j5n6X5z9z8y7x6w5v4u3t2s1r0q9p8o7n6m5l4k3j2i1h0g9f8e7d6c5b4a3' // Token de usuario de prueba
      }
    });

    const pagos = pagosResponse.data.data?.pagos || [];
    const pagosPendientes = pagos.filter(p => p.estado === 'PENDIENTE');
    
    console.log(`   Pagos encontrados: ${pagos.length}`);
    console.log(`   Pagos pendientes: ${pagosPendientes.length}`);

    if (pagosPendientes.length === 0) {
      console.log('   ❌ No hay pagos pendientes, creando uno nuevo...');
      return;
    }

    // Tomar el primer pago pendiente
    const pagoPendiente = pagosPendientes[0];
    console.log(`   Usando pago: ${pagoPendiente.id} - $${pagoPendiente.monto}`);

    // Generar QR para este pago
    console.log('\n2. Generando código QR...');
    try {
      const qrResponse = await axios.post(`${API_URL}/qr/generar`, {
        pagoId: pagoPendiente.id,
        tiempoExpiracion: 15
      }, {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtaGp1bGVqaDAwMGZyeGJmeDhhYnN2dXEiLCJlbWFpbCI6InVzdUBnbWFpbC5jb20iLCJyb2xlIjoiQ0xJRU5URSIsImlhdCI6MTc2MjIxOTU0OH0.jN8j5n6X5z9z8y7x6w5v4u3t2s1r0q9p8o7n6m5l4k3j2i1h0g9f8e7d6c5b4a3'
        }
      });

      const qrData = qrResponse.data.data;
      console.log(`   ✅ QR generado: ${qrData.codigo}`);
      console.log(`   Estado: ${qrData.estado}`);

      // Simular uso del QR
      console.log('\n3. Simulando uso del QR...');
      const usarQRResponse = await axios.post(`${API_URL}/qr/${qrData.codigo}/usar`);
      
      console.log('   ✅ QR usado exitosamente!');
      console.log('   Respuesta:', JSON.stringify(usarQRResponse.data, null, 2));

    } catch (error) {
      console.log('   ❌ Error al generar/usar QR:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Error en el test:', error.response?.data || error.message);
  }
}

testQRFlow();