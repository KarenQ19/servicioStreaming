import { Router } from 'express';
import { pagoController } from '../controllers/pagoController';
import { authenticate, authorizeClient } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación de cliente
router.use(authenticate);
router.use(authorizeClient);

// POST /api/pagos/procesar - Procesar un nuevo pago
router.post('/procesar', pagoController.procesar);
router.post('/procesar-completados', pagoController.procesarCompletados);
router.post('/:id/completar', pagoController.completar);
router.post('/:id/validar', pagoController.validar);
router.post('/:id/reembolsar', pagoController.reembolsar);
router.get('/:id/estado', pagoController.consultarEstado);

// POST /api/pagos/:id/reembolso - Solicitar reembolso de un pago
router.post('/:id/reembolso', pagoController.reembolsar);

// GET /api/pagos/:id/estado - Consultar estado detallado de un pago
router.get('/:id/estado', pagoController.consultarEstado);

// POST /api/pagos/:id/completar - Marcar pago como completado y procesar automáticamente
router.post('/:id/completar', pagoController.completar);

export default router;