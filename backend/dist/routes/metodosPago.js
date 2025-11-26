"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const metodoPagoController_1 = require("../controllers/metodoPagoController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', metodoPagoController_1.metodoPagoController.obtenerMetodosDisponibles);
router.use(auth_1.authenticate);
router.use(auth_1.authorizeClient);
router.post('/seleccionar', metodoPagoController_1.metodoPagoController.seleccionar);
router.get('/:id/validar', metodoPagoController_1.metodoPagoController.validarMetodo);
router.get('/cliente/preferido', metodoPagoController_1.metodoPagoController.obtenerMetodoPreferido);
router.delete('/cliente/preferido', metodoPagoController_1.metodoPagoController.removerMetodoPreferido);
exports.default = router;
//# sourceMappingURL=metodosPago.js.map