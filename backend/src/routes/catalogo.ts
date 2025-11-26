import { Router } from 'express';
import {
  consultarCatalogo,
  buscarServicio,
  filtrarServicios,
  obtenerCategorias
} from '../controllers/catalogoController';

const router = Router();

// GET /api/catalogo - Consultar catálogo completo
router.get('/', consultarCatalogo);

// GET /api/catalogo/buscar?q= - Buscar servicios
router.get('/buscar', buscarServicio);

// GET /api/catalogo/filtrar - Filtrar servicios
router.get('/filtrar', filtrarServicios);

// GET /api/catalogo/categorias - Obtener categorías disponibles
router.get('/categorias', obtenerCategorias);

export default router;