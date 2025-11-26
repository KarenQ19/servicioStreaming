"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const clientePagosController_1 = require("../controllers/clientePagosController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.authorizeClient);
router.post('/metodo-pago', clientePagosController_1.clientePagosController.seleccionarMetodoPago);
router.get('/pagos', clientePagosController_1.clientePagosController.consultarHistorialPagos);
router.get('/pagos/resumen', clientePagosController_1.clientePagosController.obtenerResumenPagos);
exports.default = router;
//# sourceMappingURL=clientePagos.js.map