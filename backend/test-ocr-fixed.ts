import { OCRService } from './src/services/ocrService';
import path from 'path';
import fs from 'fs';

/**
 * Script para probar el servicio OCR de forma simple
 */
async function testOCRSimple() {
  console.log('🧪 INICIANDO PRUEBA SIMPLE DE OCR\n');

  try {
    // Crear directorio de prueba si no existe
    const testDir = path.join(__dirname, 'test-ocr-images');
    if (!fs.existsSync(testDir)) {
      console.log(`📁 Creando directorio de prueba: ${testDir}`);
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Obtener instancia singleton del servicio OCR
    console.log('🔧 Obteniendo instancia del servicio OCR...');
    const ocrService = OCRService.getInstance();
    console.log('✅ Instancia obtenida correctamente\n');

    // Buscar imágenes de prueba en el directorio qr_img
    const imagePaths = [
      path.join(__dirname, '../qr_img/depositarQR.jpeg'),
      path.join(__dirname, '../qr_img/comprobantepago.jpeg'),
    ];

    for (const imagePath of imagePaths) {
      if (fs.existsSync(imagePath)) {
        console.log(`\n${'='.repeat(70)}`);
        console.log(`📸 Procesando: ${path.basename(imagePath)}`);
        console.log(`${'='.repeat(70)}`);

        try {
          const resultado = await ocrService.procesarImagen(imagePath);

          if (resultado.exito) {
            console.log(`✅ OCR Exitoso`);
            console.log(`📊 Confianza: ${resultado.confianza}%`);
            console.log(`📝 Texto extraído (primeros 500 caracteres):\n${resultado.texto.substring(0, 500)}\n`);
            console.log(`💾 Datos extraídos:`);
            console.log(JSON.stringify(resultado.datos, null, 2));
          } else {
            console.log(`❌ Error: ${resultado.error}`);
          }
        } catch (error: any) {
          console.log(`❌ Error procesando imagen: ${error.message}`);
        }
      } else {
        console.log(`⚠️  Imagen no encontrada: ${imagePath}`);
      }
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log('✅ Prueba completada');
    console.log(`${'='.repeat(70)}\n`);

    // Limpiar recursos
    console.log('🧹 Limpiando recursos...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ Recursos limpiados');

    process.exit(0);

  } catch (error: any) {
    console.error('❌ Error en prueba OCR:', error);
    process.exit(1);
  }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  testOCRSimple().catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
}

export { testOCRSimple };
