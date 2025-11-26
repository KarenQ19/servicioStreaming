const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * Servicio OCR de prueba para validar funcionamiento con imágenes existentes
 */
class OCRServicePrueba {
  constructor() {
    console.log('🚀 Inicializando servicio OCR de prueba...');
  }

  async procesarImagen(rutaImagen) {
    try {
      console.log(`📸 Procesando imagen: ${rutaImagen}`);
      
      // Verificar que existe el archivo
      if (!fs.existsSync(rutaImagen)) {
        throw new Error(`Imagen no encontrada: ${rutaImagen}`);
      }

      // Leer imagen
      const buffer = fs.readFileSync(rutaImagen);
      console.log(`   📊 Tamaño original: ${(buffer.length / 1024).toFixed(2)} KB`);

      // Preprocesar imagen
      console.log('   🔧 Preprocesando imagen...');
      const imagenProcesada = await this.preprocesarImagen(buffer);
      console.log(`   📊 Tamaño después de preprocesamiento: ${(imagenProcesada.length / 1024).toFixed(2)} KB`);

      // Ejecutar OCR
      console.log('   🔍 Ejecutando OCR con Tesseract...');
      const resultado = await Tesseract.recognize(imagenProcesada, 'spa', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`   ⏳ Progreso OCR: ${m.progress.toFixed(1)}%`);
          }
        },
        // Mejorar precisión para comprobantes bancarios
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz$-.,:/ #@',
        // Configuración específica para números y montos
        tessedit_pageseg_mode: '6', // Assume a single uniform block of text
      });

      const texto = resultado.data.text;
      const confianza = resultado.data.confidence;

      console.log(`   ✅ OCR completado - Confianza: ${confianza.toFixed(1)}%`);
      console.log(`   📝 Texto extraído (${texto.length} caracteres):`);
      console.log('   ' + '-'.repeat(50));
      console.log('   ' + texto.split('\n').map(line => line.trim()).filter(line => line).join('\n   '));
      console.log('   ' + '-'.repeat(50));

      // Extraer información relevante
      const infoExtraida = this.extraerInformacion(texto);

      return {
        texto,
        confianza,
        ...infoExtraida,
        archivo: path.basename(rutaImagen)
      };

    } catch (error) {
      console.error(`   ❌ Error procesando imagen: ${error.message}`);
      throw error;
    }
  }

  async preprocesarImagen(buffer) {
    try {
      return await sharp(buffer)
        .resize(1200, 1600, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .normalize() // Normalizar histograma
        .sharpen({ // Aplicar nitidez
          sigma: 1.0,
          flat: 1.0,
          jagged: 2.0
        })
        .jpeg({ 
          quality: 95,
          progressive: true
        })
        .toBuffer();
    } catch (error) {
      console.error('   ❌ Error en preprocesamiento:', error.message);
      // Si falla, devolver imagen original
      return buffer;
    }
  }

  extraerInformacion(texto) {
    console.log('   🔍 Extrayendo información del texto...');
    
    const resultado = {
      monto: null,
      fecha: null,
      referencia: null,
      numeroTransaccion: null,
      banco: null,
      datosAdicionales: {}
    };

    // Patrones mejorados para comprobantes bancarios chilenos
    const patrones = {
      // Montos: $1.000,00 o 1000 o $1000
      monto: /(?:\$\s*)?(\d{1,3}(?:\.?\d{3})*(?:,\d{2})?)/g,
      
      // Fechas: DD/MM/AAAA o DD-MM-AAAA
      fecha: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
      
      // Referencias: REF-123456, Número: 123456, etc
      referencia: /(?:ref|referencia|número|numero|nro)[\s#:]*([A-Z0-9\-]{4,})/gi,
      
      // Números de transacción: 8+ dígitos
      numeroTransaccion: /(?:transacción|transaccion|operación|operacion|nro)[\s:]*([0-9]{8,})/gi,
      
      // Bancos chilenos comunes
      banco: /(?:Banco|Bank|Bco)\s+(?:de\s+)?([A-Za-z\s]+?(?:\s+(?:de\s+)?Chile)?)/gi,
      
      // Cuentas: Número de cuenta, CBU, etc
      cuenta: /(?:cuenta|cbu)[\s:]*([0-9\-\s]{10,})/gi,
      
      // RUT: formato chileno
      rut: /(\d{1,3}(?:\.?\d{3}){2}\-?[0-9Kk])/g
    };

    // Extraer monto (tomar el número más grande)
    const montos = [...texto.matchAll(patrones.monto)];
    if (montos.length > 0) {
      // Convertir diferentes formatos a número
      const valores = montos.map(m => {
        const valor = m[1].replace(/\./g, '').replace(',', '.');
        return parseFloat(valor);
      }).filter(n => !isNaN(n) && n > 0);
      
      if (valores.length > 0) {
        resultado.monto = Math.max(...valores);
      }
    }

    // Extraer fecha
    const fechas = [...texto.matchAll(patrones.fecha)];
    if (fechas.length > 0) {
      const fechaStr = fechas[0][1];
      const partes = fechaStr.split(/[\/\-]/);
      if (partes.length === 3) {
        // Asumir formato DD/MM/AAAA
        const dia = parseInt(partes[0]);
        const mes = parseInt(partes[1]) - 1; // JavaScript months are 0-indexed
        const anio = parseInt(partes[2].length === 2 ? '20' + partes[2] : partes[2]);
        resultado.fecha = new Date(anio, mes, dia);
      }
    }

    // Extraer referencia
    const referencias = [...texto.matchAll(patrones.referencia)];
    if (referencias.length > 0) {
      resultado.referencia = referencias[0][1].trim();
    }

    // Extraer número de transacción
    const transacciones = [...texto.matchAll(patrones.numeroTransaccion)];
    if (transacciones.length > 0) {
      resultado.numeroTransaccion = transacciones[0][1].trim();
    }

    // Extraer banco
    const bancos = [...texto.matchAll(patrones.banco)];
    if (bancos.length > 0) {
      resultado.banco = bancos[0][1].trim();
    }

    // Extraer RUT si existe
    const ruts = [...texto.matchAll(patrones.rut)];
    if (ruts.length > 0) {
      resultado.datosAdicionales.rut = ruts[0][1];
    }

    // Extraer cuenta si existe
    const cuentas = [...texto.matchAll(patrones.cuenta)];
    if (cuentas.length > 0) {
      resultado.datosAdicionales.cuenta = cuentas[0][1].trim();
    }

    return resultado;
  }
}

// Función principal de prueba
async function probarOCR() {
  console.log('🧪 TEST DE OCR - Imágenes Existentes\n');
  
  const ocrService = new OCRServicePrueba();
  
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
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 PROCESANDO: ${imagen.nombre}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      const resultado = await ocrService.procesarImagen(imagen.ruta);
      resultados.push(resultado);
      
      console.log('\n📊 RESUMEN DE EXTRACCIÓN:');
      console.log(`   💰 Monto: ${resultado.monto ? '$' + resultado.monto.toLocaleString() : 'No detectado'}`);
      console.log(`   📅 Fecha: ${resultado.fecha ? resultado.fecha.toLocaleDateString() : 'No detectada'}`);
      console.log(`   🔢 Referencia: ${resultado.referencia || 'No detectada'}`);
      console.log(`   💳 Transacción: ${resultado.numeroTransaccion || 'No detectada'}`);
      console.log(`   🏦 Banco: ${resultado.banco || 'No detectado'}`);
      console.log(`   📈 Confianza: ${resultado.confianza.toFixed(1)}%`);
      
      if (Object.keys(resultado.datosAdicionales).length > 0) {
        console.log(`   📄 Datos adicionales:`, resultado.datosAdicionales);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  // Resumen final
  console.log(`\n${'='.repeat(60)}`);
  console.log('📈 RESUMEN GENERAL:');
  console.log(`${'='.repeat(60)}`);
  
  resultados.forEach((resultado, index) => {
    console.log(`\n${index + 1}. ${resultado.archivo}:`);
    console.log(`   ✓ Texto extraído: ${resultado.texto.length} caracteres`);
    console.log(`   ✓ Confianza: ${resultado.confianza.toFixed(1)}%`);
    console.log(`   ✓ Datos útiles: ${Object.values(resultado).filter(v => v !== null && v !== resultado.texto && v !== resultado.confianza && v !== resultado.archivo).length}`);
  });

  console.log('\n✅ Test de OCR completado');
  return resultados;
}

// Si se ejecuta directamente
if (require.main === module) {
  probarOCR()
    .then((resultados) => {
      console.log('\n📊 Test finalizado con éxito');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error en test:', error);
      process.exit(1);
    });
}

module.exports = { OCRServicePrueba, probarOCR };