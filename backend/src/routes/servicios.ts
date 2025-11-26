import { Router } from 'express';
import { 
  listarServicios, 
  mostrarDetalles, 
  actualizarInfo, 
  verificarDisponibilidad,
  buscarServicios,
  filtrarServicios,
  obtenerCategorias
} from '../controllers/servicioController';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

// GET /api/v1/servicios - Listar todos los servicios (público)
router.get('/', listarServicios);

// GET /api/v1/servicios/buscar - Buscar servicios (público)
router.get('/buscar', buscarServicios);

// GET /api/v1/servicios/filtrar - Filtrar servicios (público)
router.get('/filtrar', filtrarServicios);

// GET /api/v1/servicios/categorias - Obtener categorías (público)
router.get('/categorias', obtenerCategorias);

// GET /api/v1/servicios/:id - Obtener detalles de un servicio específico (público)
router.get('/:id', mostrarDetalles);

// PUT /api/v1/servicios/:id - Actualizar servicio (solo admin)
router.put('/:id', authenticate, authorizeAdmin, actualizarInfo);

// GET /api/v1/servicios/:id/disponibilidad - Verificar disponibilidad (público)
router.get('/:id/disponibilidad', verificarDisponibilidad);

export default router;