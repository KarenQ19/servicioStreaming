import { Router } from 'express';
import { obtenerPerfil, obtenerMetricasCliente } from '../controllers/clienteController';
import { authenticate, authorizeClient } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación y autorización de cliente
router.use(authenticate);
router.use(authorizeClient);

// GET /api/cliente/perfil - Obtener perfil del cliente
router.get('/perfil', obtenerPerfil);

// GET /api/cliente/metricas - Obtener métricas del dashboard del cliente
router.get('/metricas', obtenerMetricasCliente);

export default router;