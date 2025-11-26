import { Router } from 'express';
import { metodoPagoController } from '../controllers/metodoPagoController';
import { authenticate, authorizeClient } from '../middleware/auth';

const router = Router();

// GET /api/metodos-pago - Obtener métodos de pago disponibles (público con info adicional si está autenticado)
router.get('/', metodoPagoController.obtenerMetodosDisponibles);

// Rutas que requieren autenticación de cliente
router.use(authenticate);
router.use(authorizeClient);

// POST /api/metodos-pago/seleccionar - Seleccionar método de pago preferido
router.post('/seleccionar', metodoPagoController.seleccionar);

// GET /api/metodos-pago/:id/validar - Validar un método de pago específico
router.get('/:id/validar', metodoPagoController.validarMetodo);

// GET /api/metodos-pago/cliente/preferido - Obtener método preferido del cliente
router.get('/cliente/preferido', metodoPagoController.obtenerMetodoPreferido);

// DELETE /api/metodos-pago/cliente/preferido - Remover método preferido
router.delete('/cliente/preferido', metodoPagoController.removerMetodoPreferido);

export default router;