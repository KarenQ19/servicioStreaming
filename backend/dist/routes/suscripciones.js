"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const suscripcionController_1 = require("../controllers/suscripcionController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', suscripcionController_1.obtenerSuscripciones);
router.post('/carrito', suscripcionController_1.crearSuscripcionDesdeCarrito);
router.post('/', suscripcionController_1.crearSuscripcion);
router.get('/:suscripcionId', suscripcionController_1.obtenerDetalleSuscripcion);
router.put('/:suscripcionId/cancelar', suscripcionController_1.cancelarSuscripcion);
router.put('/:suscripcionId/pausar', suscripcionController_1.pausarSuscripcion);
router.put('/:suscripcionId/reactivar', suscripcionController_1.reactivarSuscripcion);
exports.default = router;
//# sourceMappingURL=suscripciones.js.map