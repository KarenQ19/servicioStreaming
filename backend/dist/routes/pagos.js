"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pagoController_1 = require("../controllers/pagoController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.authorizeClient);
router.post('/procesar', pagoController_1.pagoController.procesar);
router.post('/procesar-completados', pagoController_1.pagoController.procesarCompletados);
router.post('/:id/completar', pagoController_1.pagoController.completar);
router.post('/:id/validar', pagoController_1.pagoController.validar);
router.post('/:id/reembolsar', pagoController_1.pagoController.reembolsar);
router.get('/:id/estado', pagoController_1.pagoController.consultarEstado);
router.post('/:id/reembolso', pagoController_1.pagoController.reembolsar);
router.get('/:id/estado', pagoController_1.pagoController.consultarEstado);
router.post('/:id/completar', pagoController_1.pagoController.completar);
exports.default = router;
//# sourceMappingURL=pagos.js.map