import { Router } from 'express';
import {
  obtenerMisCredenciales,
  agregarCredencialesAlPool,
  obtenerCredencialesDisponibles,
  obtenerCredencialesAsignadas,
  eliminarCredencialDelPool
} from '../controllers/credencialesController';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

// Ruta para clientes - obtener sus credenciales
router.get('/mis-credenciales', authenticate, obtenerMisCredenciales);

// Rutas de administrador - requieren autenticación de administrador
router.use(authenticate);
router.use(authorizeAdmin);

// POST /api/credenciales/:servicioId/pool - Agregar credenciales al pool
router.post('/:servicioId/pool', agregarCredencialesAlPool);

// GET /api/credenciales/:servicioId/disponibles - Obtener credenciales disponibles
router.get('/:servicioId/disponibles', obtenerCredencialesDisponibles);

// GET /api/credenciales/:servicioId/asignadas - Obtener credenciales asignadas
router.get('/:servicioId/asignadas', obtenerCredencialesAsignadas);

// DELETE /api/credenciales/:credencialId - Eliminar credencial del pool
router.delete('/:credencialId', eliminarCredencialDelPool);

export default router;