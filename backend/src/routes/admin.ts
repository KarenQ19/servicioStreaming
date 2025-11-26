import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { reportesController } from '../controllers/reportesController';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

// Aplicar middleware de autenticación y admin a todas las rutas
router.use(authenticate);
router.use(authorizeAdmin);

// ===== RUTAS DE CATÁLOGO =====
// GET /api/admin/catalogo - Consultar catálogo completo con estadísticas
router.get('/catalogo', adminController.consultarCatalogo);

// ===== RUTAS DE SERVICIOS (CRUD) =====
// POST /api/admin/servicios - Agregar nuevo servicio
router.post('/servicios', adminController.agregarServicio);

// POST /api/admin/servicios (alias para insertarServicio)
router.post('/servicios/insertar', adminController.agregarServicio);

// PUT /api/admin/servicios/:id - Actualizar servicio
router.put('/servicios/:id', adminController.actualizarServicio);

// DELETE /api/admin/servicios/:id - Eliminar servicio
router.delete('/servicios/:id', adminController.eliminarServicio);

// ===== RUTAS DE REPORTES =====
// GET /api/admin/reportes/ventas - Reportes de ventas
router.get('/reportes/ventas', reportesController.consultarReportesVentas);

// GET /api/admin/reportes/actividad - Reportes de actividad
router.get('/reportes/actividad', reportesController.consultarReportesActividad);

// ===== RUTAS DE CLIENTES =====
// GET /api/admin/clientes - Consultar todos los clientes
router.get('/clientes', adminController.consultarClientes);

// POST /api/admin/clientes/:id/suspender - Suspender cliente
router.post('/clientes/:id/suspender', adminController.suspenderCliente);

// GET /api/admin/carritos/:idCliente - Consultar carrito de cliente específico
router.get('/carritos/:idCliente', adminController.consultarCarrito);

export default router;