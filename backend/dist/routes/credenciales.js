"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const credencialesController_1 = require("../controllers/credencialesController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/mis-credenciales', auth_1.authenticate, credencialesController_1.obtenerMisCredenciales);
router.use(auth_1.authenticate);
router.use(auth_1.authorizeAdmin);
router.post('/:servicioId/pool', credencialesController_1.agregarCredencialesAlPool);
router.get('/:servicioId/disponibles', credencialesController_1.obtenerCredencialesDisponibles);
router.get('/:servicioId/asignadas', credencialesController_1.obtenerCredencialesAsignadas);
router.delete('/:credencialId', credencialesController_1.eliminarCredencialDelPool);
exports.default = router;
//# sourceMappingURL=credenciales.js.map