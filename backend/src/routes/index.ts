import express from 'express';
import authRoutes from './auth';
import serviciosRoutes from './servicios';
import carritoRoutes from './carrito';
import suscripcionesRoutes from './suscripciones';
import pagosRoutes from './pagos';
import qrRoutes from './qr';
import metodosPagoRoutes from './metodosPago';
import clientePagosRoutes from './clientePagos';
import clienteServiciosRoutes from './clienteServicios';
import clienteRoutes from './cliente';
import catalogoRoutes from './catalogo';
import adminRoutes from './admin';
import usersRoutes from './users';
import credencialesRoutes from './credenciales';

const router = express.Router();

// Rutas de autenticación
router.use('/auth', authRoutes);

// Rutas de servicios (públicas)
router.use('/servicios', serviciosRoutes);

// Rutas de catálogo (públicas)
router.use('/catalogo', catalogoRoutes);

// Rutas específicas para clientes
router.use('/cliente/servicios', clienteServiciosRoutes);
router.use('/cliente', clienteRoutes);

// Rutas protegidas
router.use('/carrito', carritoRoutes);
router.use('/suscripciones', suscripcionesRoutes);
router.use('/pagos', pagosRoutes);
router.use('/qr', qrRoutes);
router.use('/clientes', clientePagosRoutes);
router.use('/users', usersRoutes);

// Rutas de administración
router.use('/admin', adminRoutes);

// Rutas de gestión de credenciales (solo admin)
router.use('/credenciales', credencialesRoutes);

// Rutas públicas
router.use('/metodos-pago', metodosPagoRoutes);

export default router;