import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

export interface DatosComprobante {
  monto: number | null;
  fecha: Date | null;
  referencia: string | null;
  numeroTransaccion: string | null;
  banco: string | null;
  codigoQR: string | null;
  datosAdicionales: Record<string, any>;
  confianza: number;
  textoCompleto: string;
}

export interface ResultadoOCR {
  exito: boolean;
  datos: DatosComprobante | null;
  error?: string;
  tiempoProcesamiento: number;
}

export class OCRService {
  private static instance: OCRService;
  
  private constructor() {}

  public static getInstance(): OCRService {
    if (!OCRService.instance) {
      OCRService.instance = new OCRService();
    }
    return OCRService.instance;
  }

  /**
   * Procesa una imagen de comprobante y extrae información relevante
   */
  async procesarComprobante(rutaImagen: string): Promise<ResultadoOCR> {
    const inicio = Date.now();
    
    try {
      // Verificar que existe el archivo
      await fs.access(rutaImagen);
      
      // Leer imagen
      const buffer = await fs.readFile(rutaImagen);
      
      // Preprocesar imagen
      const imagenProcesada = await this.preprocesarImagen(buffer);
      
      // Ejecutar OCR
      const resultadoOCR = await this.ejecutarOCR(imagenProcesada);
      
      // Extraer información relevante
      const datosExtraidos = this.extraerInformacion(resultadoOCR.data.text, resultadoOCR.data.confidence);
      
      const tiempoProcesamiento = Date.now() - inicio;
      
      return {
        exito: true,
        datos: datosExtraidos,
        tiempoProcesamiento
      };
      
    } catch (error) {
      return {
        exito: false,
        datos: null,
        error: error instanceof Error ? error.message : 'Error desconocido',
        tiempoProcesamiento: Date.now() - inicio
      };
    }
  }

  /**
   * Preprocesa la imagen para mejorar la calidad del OCR
   */
  private async preprocesarImagen(buffer: Buffer): Promise<Buffer> {
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
  }

  /**
   * Ejecuta el OCR con configuración optimizada
   */
  private async ejecutarOCR(buffer: Buffer) {
    return await Tesseract.recognize(buffer, 'spa', {
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
  }

  /**
   * Extrae información relevante del texto del comprobante
   */
  private extraerInformacion(texto: string, confianza: number): DatosComprobante {
    console.log('🔍 Extrayendo información del texto...');
    
    const resultado: DatosComprobante = {
      monto: null,
      fecha: null,
      referencia: null,
      numeroTransaccion: null,
      banco: null,
      codigoQR: null,
      datosAdicionales: {},
      confianza,
      textoCompleto: texto
    };

    // Patrones mejorados para comprobantes bancarios chilenos
    const patrones = {
      // Montos mejorados: $1.000,00 o Bs. 2500.00 o 1000
      monto: /(?:\$|Bs\.|USD|CLP)\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)|(?:Total|Envío|Monto)[\s:]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/gi,
      
      // Fechas mejoradas: DD/MM/AAAA o DD-MM-AAAA o "17 oct. 2025"
      fecha: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{1,2}\s+(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*\.?\s+\d{2,4})/gi,
      
      // Referencias: REF-123456, Número: 123456, etc
      referencia: /(?:ref|referencia|número|numero|nro|orden|order)[\s#:]*([A-Z0-9\-]{4,})/gi,
      
      // Números de transacción: 8+ dígitos
      numeroTransaccion: /(?:transacción|transaccion|operación|operacion|nro\.?\s*de\s*transacción|transaction\s*id)[\s:]*([0-9]{8,})/gi,
      
      // Bancos chilenos comunes
      banco: /(?:Banco|Bank|Bco)\s+(?:de\s+)?([A-Za-z\s]+?(?:\s+(?:de\s+)?Chile)?)/gi,
      
      // Cuentas: Número de cuenta, CBU, etc
      cuenta: /(?:cuenta|cbu|número\s*de\s*cuenta)[\s:]*([0-9\-\s]{10,})/gi,
      
      // RUT: formato chileno
      rut: /(\d{1,3}(?:\.?\d{3}){2}\-?[0-9Kk])/g,
      
      // Códigos QR
      codigoQR: /(?:qr|QR)[\s:]*([A-Z0-9]{10,})/gi
    };

    // Extraer monto (mejorado)
    const montos = this.extraerMontos(texto, patrones.monto);
    if (montos.length > 0) {
      resultado.monto = montos[0]; // Tomar el monto más probable
    }

    // Extraer fecha
    const fechas = this.extraerFechas(texto, patrones.fecha);
    if (fechas.length > 0) {
      resultado.fecha = fechas[0];
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

    // Extraer código QR si existe
    const codigosQR = [...texto.matchAll(patrones.codigoQR)];
    if (codigosQR.length > 0) {
      resultado.codigoQR = codigosQR[0][1].trim();
    }

    return resultado;
  }

  /**
   * Extrae montos del texto con mejor lógica
   */
  private extraerMontos(texto: string, patron: RegExp): number[] {
    const montos: number[] = [];
    let match;
    
    while ((match = patron.exec(texto)) !== null) {
      // Intentar ambos grupos de captura
      const montoStr = match[1] || match[2];
      if (montoStr) {
        // Limpiar el formato: "1.000,00" -> "1000.00"
        const limpio = montoStr
          .replace(/\./g, '') // Eliminar puntos de miles
          .replace(',', '.'); // Cambiar coma decimal a punto
        
        const valor = parseFloat(limpio);
        if (!isNaN(valor) && valor > 0 && valor < 1000000) { // Rango razonable
          montos.push(valor);
        }
      }
    }
    
    // Ordenar por probabilidad (montos más comunes primero)
    return montos.sort((a, b) => {
      // Preferir montos que aparezcan en contextos de pago
      const contextoA = this.esContextoPago(texto, a.toString());
      const contextoB = this.esContextoPago(texto, b.toString());
      
      if (contextoA && !contextoB) return -1;
      if (!contextoA && contextoB) return 1;
      
      // Si ambos tienen contexto o ninguno, preferir el más pequeño (más probable)
      return a - b;
    });
  }

  /**
   * Verifica si un monto aparece en contexto de pago
   */
  private esContextoPago(texto: string, monto: string): boolean {
    const contextosPago = [
      'total', 'envío', 'monto', 'pago', 'transferencia', 
      'yapeaste', 'enviado', 'pagado', 'abonado'
    ];
    
    const indiceMonto = texto.toLowerCase().indexOf(monto);
    if (indiceMonto === -1) return false;
    
    // Buscar contexto de pago cerca del monto (±50 caracteres)
    const contexto = texto.toLowerCase().substring(
      Math.max(0, indiceMonto - 50),
      Math.min(texto.length, indiceMonto + 50)
    );
    
    return contextosPago.some(term => contexto.includes(term));
  }

  /**
   * Extrae fechas del texto
   */
  private extraerFechas(texto: string, patron: RegExp): Date[] {
    const fechas: Date[] = [];
    let match;
    
    while ((match = patron.exec(texto)) !== null) {
      const fechaStr = match[1] || match[2];
      if (fechaStr) {
        const fecha = this.parsearFecha(fechaStr);
        if (fecha) {
          fechas.push(fecha);
        }
      }
    }
    
    return fechas;
  }

  /**
   * Parsea diferentes formatos de fecha
   */
  private parsearFecha(fechaStr: string): Date | null {
    // Formato DD/MM/AAAA o DD-MM-AAAA
    if (fechaStr.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/)) {
      const partes = fechaStr.split(/[\/\-]/);
      const dia = parseInt(partes[0]);
      const mes = parseInt(partes[1]) - 1; // JavaScript months are 0-indexed
      const anio = parseInt(partes[2].length === 2 ? '20' + partes[2] : partes[2]);
      
      if (dia >= 1 && dia <= 31 && mes >= 0 && mes <= 11 && anio >= 2020 && anio <= 2030) {
        return new Date(anio, mes, dia);
      }
    }
    
    // Formato "17 oct. 2025"
    if (fechaStr.match(/\d{1,2}\s+(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*\.?\s+\d{2,4}/i)) {
      const partes = fechaStr.split(/\s+/);
      const dia = parseInt(partes[0]);
      const mesStr = partes[1].toLowerCase().replace(/\./g, '');
      const anio = parseInt(partes[2]);
      
      const meses = {
        'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
      };
      
      const mes = meses[mesStr as keyof typeof meses];
      if (mes !== undefined && dia >= 1 && dia <= 31 && anio >= 2020 && anio <= 2030) {
        return new Date(anio, mes, dia);
      }
    }
    
    return null;
  }
}