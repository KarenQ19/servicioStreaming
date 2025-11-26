"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const clienteController_1 = require("../controllers/clienteController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use(auth_1.authorizeClient);
router.get('/perfil', clienteController_1.obtenerPerfil);
router.get('/metricas', clienteController_1.obtenerMetricasCliente);
exports.default = router;
//# sourceMappingURL=cliente.js.map