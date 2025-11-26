"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const servicioController_1 = require("../controllers/servicioController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', servicioController_1.listarServicios);
router.get('/buscar', servicioController_1.buscarServicios);
router.get('/filtrar', servicioController_1.filtrarServicios);
router.get('/categorias', servicioController_1.obtenerCategorias);
router.get('/:id', servicioController_1.mostrarDetalles);
router.put('/:id', auth_1.authenticate, auth_1.authorizeAdmin, servicioController_1.actualizarInfo);
router.get('/:id/disponibilidad', servicioController_1.verificarDisponibilidad);
exports.default = router;
//# sourceMappingURL=servicios.js.map