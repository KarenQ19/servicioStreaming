import { Router } from 'express';
import {
  obtenerCarrito,
  agregarItem,
  actualizarItem,
  eliminarItem,
  vaciarCarrito
} from '../controllers/carritoController';
import { authenticate, authorizeClient } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate, authorizeClient);

// GET /api/carrito - Obtener carrito del cliente
router.get('/', obtenerCarrito);

// POST /api/carrito/items - Agregar item al carrito
router.post('/items', agregarItem);

// PUT /api/carrito/items/:itemId - Actualizar cantidad de item
router.put('/items/:itemId', actualizarItem);

// DELETE /api/carrito/items/:itemId - Eliminar item del carrito
router.delete('/items/:itemId', eliminarItem);

// DELETE /api/carrito - Vaciar carrito
router.delete('/', vaciarCarrito);

export default router;
