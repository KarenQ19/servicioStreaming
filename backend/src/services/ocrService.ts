import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import path from 'path';

/**
 * Servicio OCR para procesar imágenes de comprobantes bancarios
 */
export class OCRService {
  private worker: any = null;
  private static instance: OCRService | null = null;
  private initialized = false;

  constructor() {
    // No inicializamos aquí, lo hacemos lazy
  }

  /**
   * Obtener instancia singleton del OCRService
   */
  static getInstance(): OCRService {
    if (!OCRService.instance) {
      OCRService.instance = new OCRService();
    }
    return OCRService.instance;
  }

  /**
   * Inicializar el worker de Tesseract.js
   */
  private async inicializarWorker(): Promise<void> {
    try {
      if (this.initialized && this.worker) {
        console.log('✅ Worker Tesseract.js ya estaba inicializado');
        return;
      }

      console.log('🔄 Inicializando worker Tesseract.js...');
      this.worker = await createWorker('spa', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`🔄 Progreso OCR: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      
      this.initialized = true;
      console.log('✅ Worker Tesseract.js inicializado');
    } catch (error) {
      console.error('❌ Error inicializando worker Tesseract:', error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Procesar imagen de comprobante bancario
   */
  async procesarImagen(imagePath: string): Promise<any> {
    try {
      console.log(`📸 Procesando imagen: ${path.basename(imagePath)}`);

      // Preprocesar imagen para mejorar OCR
      const imagenPreprocesada = await this.preprocesarImagen(imagePath);
      
      // Ejecutar OCR
      const resultadoOCR = await this.ejecutarOCR(imagenPreprocesada);
      
      // Extraer información relevante
      const datosExtraidos = this.extraerInformacion(resultadoOCR.text);
      
      console.log(`✅ OCR completado con confianza: ${resultadoOCR.confidence}%`);
      console.log(`📊 Datos extraídos:`, datosExtraidos);

      return {
        exito: true,
        texto: resultadoOCR.text,
        confianza: resultadoOCR.confidence,
        datos: datosExtraidos
      };

    } catch (error) {
      console.error('❌ Error en procesamiento OCR:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido en OCR'
      };
    }
  }

  /**
   * Procesar imagen de comprobante bancario (con manejo de Buffer)
   */
  async procesarBuffer(imageBuffer: Buffer): Promise<any> {
    try {
      console.log(`📸 Procesando buffer de imagen...`);

      // Preprocesar buffer para mejorar OCR
      const imagenPreprocesada = await this.preprocesarBuffer(imageBuffer);
      
      // Ejecutar OCR
      const resultadoOCR = await this.ejecutarOCR(imagenPreprocesada);
      
      // Extraer información relevante
      const datosExtraidos = this.extraerInformacion(resultadoOCR.text);
      
      console.log(`✅ OCR completado con confianza: ${resultadoOCR.confidence}%`);
      console.log(`📊 Datos extraídos:`, datosExtraidos);

      return {
        exito: true,
        texto: resultadoOCR.text,
        confianza: resultadoOCR.confidence,
        datos: datosExtraidos
      };

    } catch (error) {
      console.error('❌ Error en procesamiento OCR:', error);
      return {
        exito: false,
        error: error instanceof Error ? error.message : 'Error desconocido en OCR'
      };
    }
  }

  /**
   * Preprocesar imagen para mejorar la precisión del OCR
   */
  private async preprocesarImagen(imagePath: string): Promise<Buffer> {
    try {
      console.log('🎨 Preprocesando imagen...');
      const extension = path.extname(imagePath).toLowerCase();
      let baseInput: Buffer | string = imagePath;
      if (extension === '.pdf') {
        try {
          baseInput = await sharp(imagePath, { density: 300 }).png().toBuffer();
        } catch (pdfError) {
          console.error('Error convirtiendo PDF:', pdfError);
          throw new Error('Este entorno no soporta PDF, sube la imagen del comprobante en JPEG/PNG/GIF/BMP/TIFF/WebP.');
        }
      }
      
      const buffer = await sharp(baseInput)
        .resize(1200, undefined, { 
          withoutEnlargement: true,
          fit: 'inside' 
        })
        .grayscale()
        .normalize()
        .modulate({ brightness: 1.1 })
        .sharpen(1.0, 1.0, 2.0)
        .toBuffer();

      console.log('✅ Preprocesamiento completado');
      return buffer;
      
    } catch (error) {
      console.error('❌ Error en preprocesamiento:', error);
      const sharpOriginal = sharp(imagePath);
      return await sharpOriginal.toBuffer();
    }
  }

  /**
   * Preprocesar buffer de imagen para mejorar la precisión del OCR
   */
  private async preprocesarBuffer(imageBuffer: Buffer): Promise<Buffer> {
    try {
      console.log('🎨 Preprocesando buffer de imagen...');
      
      const buffer = await sharp(imageBuffer)
        .resize(1200, undefined, { 
          withoutEnlargement: true,
          fit: 'inside' 
        })
        .grayscale()
        .normalize()
        .modulate({ brightness: 1.1 })
        .sharpen(1.0, 1.0, 2.0)
        .toBuffer();

      console.log('✅ Preprocesamiento de buffer completado');
      return buffer;
      
    } catch (error) {
      console.error('❌ Error en preprocesamiento de buffer:', error);
      return imageBuffer;
    }
  }

  /**
   * Ejecutar OCR con Tesseract.js
   */
  private async ejecutarOCR(imageBuffer: Buffer): Promise<any> {
    try {
      // Asegurar que el worker esté inicializado
      if (!this.worker) {
        await this.inicializarWorker();
      }

      const result = await this.worker.recognize(imageBuffer, {
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzáéíóúÁÉÍÓÚñÑ.,$-#%&/()=\'¿¡!?\n ',
        preserve_interword_spaces: '1',
        tessedit_pageseg_mode: '6', // Assume a single uniform block of text
      });

      return {
        text: result.data.text,
        confidence: result.data.confidence
      };
      
    } catch (error) {
      console.error('❌ Error ejecutando OCR:', error);
      throw new Error('Error al ejecutar OCR');
    }
  }

  /**
   * Extraer información relevante del texto OCR
   */
  private extraerInformacion(texto: string): any {
    const datos = {
      monto: null,
      fecha: null,
      referencia: null,
      transaccion: null,
      banco: null,
      rut: null,
      codigoQR: null
    };

    const textoLimpio = texto.replace(/\s+/g, ' ').trim();

    // Patrones para comprobantes bancarios chilenos
    const patrones = {
      // Montos (varios formatos)
      monto: [
        /Monto[\s:]*\$?([0-9.,]+)/i,
        /Total[\s:]*\$?([0-9.,]+)/i,
        /Valor[\s:]*\$?([0-9.,]+)/i,
        /\$([0-9.,]+)/g,
        /([0-9.,]+)\s*(?:CLP|pesos)/i
      ],
      
      // Fechas (varios formatos)
      fecha: [
        /Fecha[\s:]*([0-9]{1,2}[-\/][0-9]{1,2}[-\/][0-9]{2,4})/i,
        /([0-9]{1,2}[-\/][0-9]{1,2}[-\/][0-9]{2,4})/,
        /([0-9]{4}[-\/][0-9]{1,2}[-\/][0-9]{1,2})/
      ],
      
      // Referencias
      referencia: [
        /Referencia[\s:]*([A-Za-z0-9\-]+)/i,
        /N\.?\s*Ref[\s:]*([A-Za-z0-9\-]+)/i,
        /Código[\s:]*([A-Za-z0-9\-]+)/i
      ],
      
      // Números de transacción
      transaccion: [
        /Transacción[\s:]*([0-9]+)/i,
        /N\.?\s*Trans[\s:]*([0-9]+)/i,
        /Operación[\s:]*([0-9]+)/i,
        /N°\s*([0-9]{6,})/
      ],
      
      // Bancos chilenos comunes
      banco: [
        /(Banco\s+Estado|BancoEstado)/i,
        /(Banco\s+Santander|Santander)/i,
        /(Banco\s+de\s+Chile|BancodeChile)/i,
        /(Banco\s+BICE|BICE)/i,
        /(Banco\s+Scotiabank|Scotiabank)/i,
        /(Banco\s+Itaú|Itaú)/i
      ],
      
      // RUT chileno
      rut: [
        /R\.?U\.?T[\s:]*([0-9.,]+-[0-9kK])/i,
        /([0-9.,]+-[0-9kK])/i
      ],
      
      // Código QR
      codigoQR: [
        /QR[\s:]*([A-Za-z0-9]+)/i,
        /Código\s+QR[\s:]*([A-Za-z0-9]+)/i
      ]
    };

    // Extraer cada tipo de dato
    Object.keys(patrones).forEach(tipo => {
      for (const patron of patrones[tipo as keyof typeof patrones]) {
        const matches = textoLimpio.match(patron);
        if (matches && matches.length > 0) {
          const match = matches[0];
          const groups = match.match(/\((.*?)\)/);
          const valor = groups ? groups[1] : match.split(/[\s:]/).pop();
          
          if (valor && valor.trim()) {
            datos[tipo as keyof typeof datos] = this.limpiarValor(tipo as keyof typeof datos, valor.trim());
            break;
          }
        }
      }
    });

    // Intentar extraer monto adicional si no se encontró
    if (!datos.monto) {
      const montosEncontrados = this.buscarMontosAdicionales(textoLimpio);
      if (montosEncontrados.length > 0) {
        datos.monto = montosEncontrados[0];
      }
    }

    return datos;
  }

  /**
   * Buscar montos adicionales en el texto
   */
  private buscarMontosAdicionales(texto: string): string[] {
    const montos: string[] = [];
    const patronMonto = /\$?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/g;
    let match;

    while ((match = patronMonto.exec(texto)) !== null) {
      const valor = match[1].replace(/,/g, '');
      const numero = parseFloat(valor);
      
      // Filtrar montos razonables (entre $100 y $100,000,000)
      if (numero >= 100 && numero <= 100000000) {
        montos.push(valor);
      }
    }

    return montos;
  }

  /**
   * Limpiar y formatear valores extraídos
   */
  private limpiarValor(tipo: string, valor: string): string {
    switch (tipo) {
      case 'monto':
        // Limpiar formato de número
        return valor.replace(/[^0-9.-]/g, '');
      
      case 'fecha':
        // Normalizar formato de fecha
        return valor.replace(/\//g, '-');
      
      case 'rut':
        // Limpiar RUT
        return valor.replace(/[^0-9kK-]/g, '');
      
      case 'transaccion':
        // Limpiar número de transacción
        return valor.replace(/[^0-9]/g, '');
      
      default:
        return valor.trim();
    }
  }

  /**
   * Cerrar el worker de Tesseract (llamar al finalizar)
   */
  async cerrarWorker(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      console.log('✅ Worker Tesseract.js cerrado');
    }
  }
}