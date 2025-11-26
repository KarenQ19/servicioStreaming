import { Router, Request, Response } from 'express';
import { qrController } from '../controllers/qrController';
import { authenticate, authorizeClient } from '../middleware/auth';
import { ValidacionOCRController } from '../controllers/validacionOCRController';
import { UploadOCRMiddleware } from '../middleware/uploadOCR';
import { OCRService } from '../services/ocrService';

const router = Router();
const uploadOCR = new UploadOCRMiddleware();

// POST /api/qr/generar - Generar código QR para un pago
router.post('/generar', authenticate, authorizeClient, qrController.generarQR);

// GET /api/qr/validaciones/historial - Obtener historial de validaciones OCR del usuario (DEBE IR ANTES DE /:pagoId)
router.get('/validaciones/historial',
  authenticate,
  authorizeClient,
  ValidacionOCRController.obtenerHistorialValidaciones
);

// POST /api/qr/demo-ocr - Endpoint de demostración para probar OCR con imágenes de ejemplo (DEBE IR ANTES DE /:pagoId)
router.post('/demo-ocr',
  uploadOCR.subirComprobante(),
  async (req: any, res: any) => {
    try {
      const imagenPath = req.file?.path;
      
      if (!imagenPath) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionó imagen'
        });
      }

      // Procesar imagen con OCR
      const ocrService = OCRService.getInstance();
      const resultado = await ocrService.procesarImagen(imagenPath);

      return res.json({
        success: true,
        data: resultado,
        message: resultado.exito ? 'OCR procesado exitosamente' : 'Error en procesamiento OCR'
      });

    } catch (error) {
      console.error('Error en demo OCR:', error);
      return res.status(500).json({
        success: false,
        message: 'Error en procesamiento de demostración OCR'
      });
    }
  }
);

// GET /api/qr/:codigo/validar - Validar un código QR (puede ser público para comercios)
router.get('/:codigo/validar', qrController.validarQR);

// GET /api/qr/:id/estado - Consultar estado de un QR (requiere autenticación)
router.get('/:id/estado', authenticate, authorizeClient, qrController.consultarEstadoQR);

// POST /api/qr/:codigo/usar - Marcar QR como usado (para comercios/admin)
router.post('/:codigo/usar', qrController.usarQR);

// POST /api/qr/:pagoId/validar-ocr - Validar comprobante de pago mediante OCR (DEBE IR DESPUÉS DE RUTAS ESPECÍFICAS)
router.post('/:pagoId/validar-ocr',
  authenticate,
  authorizeClient,
  uploadOCR.subirComprobante(),
  ValidacionOCRController.validarComprobante
);

export default router;