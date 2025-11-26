import { Router } from 'express';
import {
  buscarServiciosCliente,
  consultarServicios,
  filtrarServicios
} from '../controllers/clienteServiciosController';

const router = Router();

// GET /api/clientes/servicios/buscar - Buscar servicios para clientes
router.get('/buscar', buscarServiciosCliente);

// GET /api/clientes/servicios - Consultar servicios para clientes
router.get('/', consultarServicios);

// GET /api/clientes/servicios/filtrar - Filtrar servicios para clientes
router.get('/filtrar', filtrarServicios);

export default router;