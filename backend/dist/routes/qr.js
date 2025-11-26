"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const qrController_1 = require("../controllers/qrController");
const auth_1 = require("../middleware/auth");
const validacionOCRController_1 = require("../controllers/validacionOCRController");
const uploadOCR_1 = require("../middleware/uploadOCR");
const ocrService_1 = require("../services/ocrService");
const router = (0, express_1.Router)();
const uploadOCR = new uploadOCR_1.UploadOCRMiddleware();
router.post('/generar', auth_1.authenticate, auth_1.authorizeClient, qrController_1.qrController.generarQR);
router.get('/validaciones/historial', auth_1.authenticate, auth_1.authorizeClient, validacionOCRController_1.ValidacionOCRController.obtenerHistorialValidaciones);
router.post('/demo-ocr', uploadOCR.subirComprobante(), async (req, res) => {
    try {
        const imagenPath = req.file?.path;
        if (!imagenPath) {
            return res.status(400).json({
                success: false,
                message: 'No se proporcionó imagen'
            });
        }
        const ocrService = ocrService_1.OCRService.getInstance();
        const resultado = await ocrService.procesarImagen(imagenPath);
        return res.json({
            success: true,
            data: resultado,
            message: resultado.exito ? 'OCR procesado exitosamente' : 'Error en procesamiento OCR'
        });
    }
    catch (error) {
        console.error('Error en demo OCR:', error);
        return res.status(500).json({
            success: false,
            message: 'Error en procesamiento de demostración OCR'
        });
    }
});
router.get('/:codigo/validar', qrController_1.qrController.validarQR);
router.get('/:id/estado', auth_1.authenticate, auth_1.authorizeClient, qrController_1.qrController.consultarEstadoQR);
router.post('/:codigo/usar', qrController_1.qrController.usarQR);
router.post('/:pagoId/validar-ocr', auth_1.authenticate, auth_1.authorizeClient, uploadOCR.subirComprobante(), validacionOCRController_1.ValidacionOCRController.validarComprobante);
exports.default = router;
//# sourceMappingURL=qr.js.map