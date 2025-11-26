const { OCRService } = require('./services/ocrService');
const path = require('path');

/**
 * Test mejorado del servicio OCR con lógica de parsing mejorada
 */
async function testOCRMejorado() {
  console.log('🧪 TEST OCR MEJORADO - Imágenes Existentes\n');
  
  const ocrService = OCRService.getInstance();
  
  const imagenes = [
    {
      nombre: 'depositarQR.jpeg',
      ruta: path.join(__dirname, '../qr_img/depositarQR.jpeg')
    },
    {
      nombre: 'comprobantepago.jpeg', 
      ruta: path.join(__dirname, '../qr_img/comprobantepago.jpeg')
    }
  ];

  const resultados = [];

  for (const imagen of imagenes) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📋 PROCESANDO: ${imagen.nombre}`);
    console.log(`${'='.repeat(70)}`);
    
    try {
      const resultado = await ocrService.procesarComprobante(imagen.ruta);
      
      if (resultado.exito && resultado.datos) {
        resultados.push({
          ...resultado.datos,
          archivo: imagen.nombre
        });
        
        console.log('\n✅ OCR COMPLETADO CON ÉXITO');
        console.log(`   ⏱️  Tiempo de procesamiento: ${resultado.tiempoProcesamiento}ms`);
        console.log(`   📊 Confianza: ${resultado.datos.confianza.toFixed(1)}%`);
        
        console.log('\n📊 DATOS EXTRAÍDOS:');
        console.log(`   💰 Monto: ${resultado.datos.monto ? '$' + resultado.datos.monto.toLocaleString() : 'No detectado'}`);
        console.log(`   📅 Fecha: ${resultado.datos.fecha ? resultado.datos.fecha.toLocaleDateString('es-CL') : 'No detectada'}`);
        console.log(`   🔢 Referencia: ${resultado.datos.referencia || 'No detectada'}`);
        console.log(`   💳 Transacción: ${resultado.datos.numeroTransaccion || 'No detectada'}`);
        console.log(`   🏦 Banco: ${resultado.datos.banco || 'No detectado'}`);
        console.log(`   📱 Código QR: ${resultado.datos.codigoQR || 'No detectado'}`);
        
        if (Object.keys(resultado.datos.datosAdicionales).length > 0) {
          console.log(`   📄 Datos adicionales:`, resultado.datos.datosAdicionales);
        }
        
        // Mostrar texto completo para análisis
        console.log('\n📝 TEXTO COMPLETO EXTRAÍDO:');
        console.log('   ' + '-'.repeat(60));
        const lineas = resultado.datos.textoCompleto.split('\n')
          .map(linea => linea.trim())
          .filter(linea => linea.length > 0);
        
        lineas.forEach((linea, index) => {
          console.log(`   ${(index + 1).toString().padStart(2)}. ${linea}`);
        });
        console.log('   ' + '-'.repeat(60));
        
      } else {
        console.log(`\n❌ ERROR: ${resultado.error}`);
      }
      
    } catch (error) {
      console.log(`\n❌ ERROR INESPERADO: ${error.message}`);
    }
  }

  // Resumen final y análisis
  console.log(`\n${'='.repeat(70)}`);
  console.log('📈 ANÁLISIS DE RESULTADOS:');
  console.log(`${'='.repeat(70)}`);
  
  resultados.forEach((resultado, index) => {
    console.log(`\n${index + 1}. ${resultado.archivo}:`);
    console.log(`   ✓ Confianza: ${resultado.confianza.toFixed(1)}%`);
    console.log(`   ✓ Datos útiles: ${contarDatosUtiles(resultado)}`);
    console.log(`   ✓ Monto detectado: ${resultado.monto ? 'Sí' : 'No'}`);
    console.log(`   ✓ Fecha detectada: ${resultado.fecha ? 'Sí' : 'No'}`);
    console.log(`   ✓ Transacción detectada: ${resultado.numeroTransaccion ? 'Sí' : 'No'}`);
    
    // Validación de datos
    const validacion = validarDatosComprobante(resultado);
    console.log(`   ✓ Datos válidos: ${validacion.valido ? 'Sí' : 'No'}`);
    if (!validacion.valido) {
      console.log(`   ⚠️  Problemas: ${validacion.problemas.join(', ')}`);
    }
  });

  console.log('\n✅ Test OCR mejorado completado');
  return resultados;
}

/**
 * Cuenta los datos útiles extraídos
 */
function contarDatosUtiles(resultado) {
  let count = 0;
  if (resultado.monto) count++;
  if (resultado.fecha) count++;
  if (resultado.referencia) count++;
  if (resultado.numeroTransaccion) count++;
  if (resultado.banco) count++;
  if (resultado.codigoQR) count++;
  count += Object.keys(resultado.datosAdicionales).length;
  return count;
}

/**
 * Valida si los datos del comprobante son suficientes para validación
 */
function validarDatosComprobante(resultado) {
  const problemas = [];
  
  if (!resultado.monto) {
    problemas.push('Monto no detectado');
  }
  
  if (!resultado.fecha) {
    problemas.push('Fecha no detectada');
  }
  
  if (!resultado.numeroTransaccion && !resultado.referencia) {
    problemas.push('Número de transacción o referencia no detectados');
  }
  
  if (resultado.confianza < 70) {
    problemas.push('Baja confianza del OCR');
  }
  
  return {
    valido: problemas.length === 0,
    problemas
  };
}

/**
 * Test de validación OCR con datos simulados de pago QR
 */
function testValidacionOCR(resultados) {
  console.log(`\n${'='.repeat(70)}`);
  console.log('🔍 TEST DE VALIDACIÓN CON DATOS QR SIMULADOS:');
  console.log(`${'='.repeat(70)}`);
  
  // Simular datos de un pago QR
  const pagoQRSimulado = {
    monto: 2500.00,
    referencia: 'QR-123456',
    fecha: new Date('2025-10-17'),
    numeroTransaccion: '385646444'
  };
  
  console.log('\n📋 DATOS DEL PAGO QR SIMULADO:');
  console.log(`   💰 Monto esperado: $${pagoQRSimulado.monto.toLocaleString()}`);
  console.log(`   📅 Fecha esperada: ${pagoQRSimulado.fecha.toLocaleDateString('es-CL')}`);
  console.log(`   🔢 Referencia esperada: ${pagoQRSimulado.referencia}`);
  console.log(`   💳 Transacción esperada: ${pagoQRSimulado.numeroTransaccion}`);
  
  resultados.forEach((resultado, index) => {
    console.log(`\n${index + 1}. Validando ${resultado.archivo}:`);
    
    const validacion = validarContraPagoQR(resultado, pagoQRSimulado);
    
    console.log(`   ✅ Monto coincide: ${validacion.montoCoincide ? 'Sí' : 'No'}`);
    console.log(`   ✅ Fecha coincide: ${validacion.fechaCoincide ? 'Sí' : 'No'}`);
    console.log(`   ✅ Transacción coincide: ${validacion.transaccionCoincide ? 'Sí' : 'No'}`);
    console.log(`   ✅ Referencia coincide: ${validacion.referenciaCoincide ? 'Sí' : 'No'}`);
    console.log(`   📊 Coincidencia total: ${validacion.coincidenciaTotal}%`);
    console.log(`   🎯 Pago válido: ${validacion.pagoValido ? '✅ SÍ' : '❌ NO'}`);
  });
}

/**
 * Valida los datos del comprobante contra los datos del pago QR
 */
function validarContraPagoQR(comprobante, pagoQR) {
  let coincidencias = 0;
  let totalVerificaciones = 0;
  
  // Verificar monto (con tolerancia de 1%)
  const montoCoincide = comprobante.monto && 
    Math.abs(comprobante.monto - pagoQR.monto) <= (pagoQR.monto * 0.01);
  totalVerificaciones++;
  if (montoCoincide) coincidencias++;
  
  // Verificar fecha (mismo día)
  const fechaCoincide = comprobante.fecha && 
    comprobante.fecha.toDateString() === pagoQR.fecha.toDateString();
  totalVerificaciones++;
  if (fechaCoincide) coincidencias++;
  
  // Verificar transacción
  const transaccionCoincide = comprobante.numeroTransaccion === pagoQR.numeroTransaccion;
  totalVerificaciones++;
  if (transaccionCoincide) coincidencias++;
  
  // Verificar referencia
  const referenciaCoincide = comprobante.referencia === pagoQR.referencia;
  totalVerificaciones++;
  if (referenciaCoincide) coincidencias++;
  
  const coincidenciaTotal = Math.round((coincidencias / totalVerificaciones) * 100);
  
  // Pago válido si tiene al menos 75% de coincidencia y el monto coincide
  const pagoValido = coincidenciaTotal >= 75 && montoCoincide;
  
  return {
    montoCoincide,
    fechaCoincide,
    transaccionCoincide,
    referenciaCoincide,
    coincidenciaTotal,
    pagoValido
  };
}

// Si se ejecuta directamente
if (require.main === module) {
  testOCRMejorado()
    .then((resultados) => {
      // Ejecutar test de validación
      testValidacionOCR(resultados);
      
      console.log('\n✅ Todos los tests completados con éxito');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error en test:', error);
      process.exit(1);
    });
}

module.exports = { testOCRMejorado };