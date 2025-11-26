import { Router } from 'express';
import { clientePagosController } from '../controllers/clientePagosController';
import { authenticate, authorizeClient } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación y autorización de cliente
router.use(authenticate);
router.use(authorizeClient);

// POST /api/clientes/metodo-pago - Seleccionar método de pago preferido
router.post('/metodo-pago', clientePagosController.seleccionarMetodoPago);

// GET /api/clientes/pagos - Consultar historial de pagos con filtros y paginación
router.get('/pagos', clientePagosController.consultarHistorialPagos);

// GET /api/clientes/pagos/resumen - Obtener resumen de pagos del cliente
router.get('/pagos/resumen', clientePagosController.obtenerResumenPagos);

export default router;