"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OCRService = void 0;
const tesseract_js_1 = require("tesseract.js");
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
class OCRService {
    constructor() {
        this.worker = null;
        this.initialized = false;
    }
    static getInstance() {
        if (!OCRService.instance) {
            OCRService.instance = new OCRService();
        }
        return OCRService.instance;
    }
    async inicializarWorker() {
        try {
            if (this.initialized && this.worker) {
                console.log('✅ Worker Tesseract.js ya estaba inicializado');
                return;
            }
            console.log('🔄 Inicializando worker Tesseract.js...');
            this.worker = await (0, tesseract_js_1.createWorker)('spa', 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        console.log(`🔄 Progreso OCR: ${Math.round(m.progress * 100)}%`);
                    }
                }
            });
            this.initialized = true;
            console.log('✅ Worker Tesseract.js inicializado');
        }
        catch (error) {
            console.error('❌ Error inicializando worker Tesseract:', error);
            this.initialized = false;
            throw error;
        }
    }
    async procesarImagen(imagePath) {
        try {
            console.log(`📸 Procesando imagen: ${path_1.default.basename(imagePath)}`);
            const imagenPreprocesada = await this.preprocesarImagen(imagePath);
            const resultadoOCR = await this.ejecutarOCR(imagenPreprocesada);
            const datosExtraidos = this.extraerInformacion(resultadoOCR.text);
            console.log(`✅ OCR completado con confianza: ${resultadoOCR.confidence}%`);
            console.log(`📊 Datos extraídos:`, datosExtraidos);
            return {
                exito: true,
                texto: resultadoOCR.text,
                confianza: resultadoOCR.confidence,
                datos: datosExtraidos
            };
        }
        catch (error) {
            console.error('❌ Error en procesamiento OCR:', error);
            return {
                exito: false,
                error: error instanceof Error ? error.message : 'Error desconocido en OCR'
            };
        }
    }
    async procesarBuffer(imageBuffer) {
        try {
            console.log(`📸 Procesando buffer de imagen...`);
            const imagenPreprocesada = await this.preprocesarBuffer(imageBuffer);
            const resultadoOCR = await this.ejecutarOCR(imagenPreprocesada);
            const datosExtraidos = this.extraerInformacion(resultadoOCR.text);
            console.log(`✅ OCR completado con confianza: ${resultadoOCR.confidence}%`);
            console.log(`📊 Datos extraídos:`, datosExtraidos);
            return {
                exito: true,
                texto: resultadoOCR.text,
                confianza: resultadoOCR.confidence,
                datos: datosExtraidos
            };
        }
        catch (error) {
            console.error('❌ Error en procesamiento OCR:', error);
            return {
                exito: false,
                error: error instanceof Error ? error.message : 'Error desconocido en OCR'
            };
        }
    }
    async preprocesarImagen(imagePath) {
        try {
            console.log('🎨 Preprocesando imagen...');
            const extension = path_1.default.extname(imagePath).toLowerCase();
            let baseInput = imagePath;
            if (extension === '.pdf') {
                try {
                    baseInput = await (0, sharp_1.default)(imagePath, { density: 300 }).png().toBuffer();
                }
                catch (pdfError) {
                    console.error('Error convirtiendo PDF:', pdfError);
                    throw new Error('Este entorno no soporta PDF, sube la imagen del comprobante en JPEG/PNG/GIF/BMP/TIFF/WebP.');
                }
            }
            const buffer = await (0, sharp_1.default)(baseInput)
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
        }
        catch (error) {
            console.error('❌ Error en preprocesamiento:', error);
            const sharpOriginal = (0, sharp_1.default)(imagePath);
            return await sharpOriginal.toBuffer();
        }
    }
    async preprocesarBuffer(imageBuffer) {
        try {
            console.log('🎨 Preprocesando buffer de imagen...');
            const buffer = await (0, sharp_1.default)(imageBuffer)
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
        }
        catch (error) {
            console.error('❌ Error en preprocesamiento de buffer:', error);
            return imageBuffer;
        }
    }
    async ejecutarOCR(imageBuffer) {
        try {
            if (!this.worker) {
                await this.inicializarWorker();
            }
            const result = await this.worker.recognize(imageBuffer, {
                tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzáéíóúÁÉÍÓÚñÑ.,$-#%&/()=\'¿¡!?\n ',
                preserve_interword_spaces: '1',
                tessedit_pageseg_mode: '6',
            });
            return {
                text: result.data.text,
                confidence: result.data.confidence
            };
        }
        catch (error) {
            console.error('❌ Error ejecutando OCR:', error);
            throw new Error('Error al ejecutar OCR');
        }
    }
    extraerInformacion(texto) {
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
        const patrones = {
            monto: [
                /Monto[\s:]*\$?([0-9.,]+)/i,
                /Total[\s:]*\$?([0-9.,]+)/i,
                /Valor[\s:]*\$?([0-9.,]+)/i,
                /\$([0-9.,]+)/g,
                /([0-9.,]+)\s*(?:CLP|pesos)/i
            ],
            fecha: [
                /Fecha[\s:]*([0-9]{1,2}[-\/][0-9]{1,2}[-\/][0-9]{2,4})/i,
                /([0-9]{1,2}[-\/][0-9]{1,2}[-\/][0-9]{2,4})/,
                /([0-9]{4}[-\/][0-9]{1,2}[-\/][0-9]{1,2})/
            ],
            referencia: [
                /Referencia[\s:]*([A-Za-z0-9\-]+)/i,
                /N\.?\s*Ref[\s:]*([A-Za-z0-9\-]+)/i,
                /Código[\s:]*([A-Za-z0-9\-]+)/i
            ],
            transaccion: [
                /Transacción[\s:]*([0-9]+)/i,
                /N\.?\s*Trans[\s:]*([0-9]+)/i,
                /Operación[\s:]*([0-9]+)/i,
                /N°\s*([0-9]{6,})/
            ],
            banco: [
                /(Banco\s+Estado|BancoEstado)/i,
                /(Banco\s+Santander|Santander)/i,
                /(Banco\s+de\s+Chile|BancodeChile)/i,
                /(Banco\s+BICE|BICE)/i,
                /(Banco\s+Scotiabank|Scotiabank)/i,
                /(Banco\s+Itaú|Itaú)/i
            ],
            rut: [
                /R\.?U\.?T[\s:]*([0-9.,]+-[0-9kK])/i,
                /([0-9.,]+-[0-9kK])/i
            ],
            codigoQR: [
                /QR[\s:]*([A-Za-z0-9]+)/i,
                /Código\s+QR[\s:]*([A-Za-z0-9]+)/i
            ]
        };
        Object.keys(patrones).forEach(tipo => {
            for (const patron of patrones[tipo]) {
                const matches = textoLimpio.match(patron);
                if (matches && matches.length > 0) {
                    const match = matches[0];
                    const groups = match.match(/\((.*?)\)/);
                    const valor = groups ? groups[1] : match.split(/[\s:]/).pop();
                    if (valor && valor.trim()) {
                        datos[tipo] = this.limpiarValor(tipo, valor.trim());
                        break;
                    }
                }
            }
        });
        if (!datos.monto) {
            const montosEncontrados = this.buscarMontosAdicionales(textoLimpio);
            if (montosEncontrados.length > 0) {
                datos.monto = montosEncontrados[0];
            }
        }
        return datos;
    }
    buscarMontosAdicionales(texto) {
        const montos = [];
        const patronMonto = /\$?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/g;
        let match;
        while ((match = patronMonto.exec(texto)) !== null) {
            const valor = match[1].replace(/,/g, '');
            const numero = parseFloat(valor);
            if (numero >= 100 && numero <= 100000000) {
                montos.push(valor);
            }
        }
        return montos;
    }
    limpiarValor(tipo, valor) {
        switch (tipo) {
            case 'monto':
                return valor.replace(/[^0-9.-]/g, '');
            case 'fecha':
                return valor.replace(/\//g, '-');
            case 'rut':
                return valor.replace(/[^0-9kK-]/g, '');
            case 'transaccion':
                return valor.replace(/[^0-9]/g, '');
            default:
                return valor.trim();
        }
    }
    async cerrarWorker() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
            console.log('✅ Worker Tesseract.js cerrado');
        }
    }
}
exports.OCRService = OCRService;
OCRService.instance = null;
//# sourceMappingURL=ocrService.js.map