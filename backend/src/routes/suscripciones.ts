import { Router } from 'express';
import {
  obtenerSuscripciones,
  crearSuscripcionDesdeCarrito,
  crearSuscripcion,
  cancelarSuscripcion,
  pausarSuscripcion,
  reactivarSuscripcion,
  obtenerDetalleSuscripcion
} from '../controllers/suscripcionController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/suscripciones - Obtener suscripciones del cliente
router.get('/', obtenerSuscripciones);

// POST /api/suscripciones/carrito - Crear suscripciones desde carrito
router.post('/carrito', crearSuscripcionDesdeCarrito);

// POST /api/suscripciones - Crear suscripción individual
router.post('/', crearSuscripcion);

// GET /api/suscripciones/:suscripcionId - Obtener detalles de suscripción
router.get('/:suscripcionId', obtenerDetalleSuscripcion);

// PUT /api/suscripciones/:suscripcionId/cancelar - Cancelar suscripción
router.put('/:suscripcionId/cancelar', cancelarSuscripcion);

// PUT /api/suscripciones/:suscripcionId/pausar - Pausar suscripción
router.put('/:suscripcionId/pausar', pausarSuscripcion);

// PUT /api/suscripciones/:suscripcionId/reactivar - Reactivar suscripción
router.put('/:suscripcionId/reactivar', reactivarSuscripcion);

export default router;