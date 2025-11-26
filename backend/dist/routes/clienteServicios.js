"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const clienteServiciosController_1 = require("../controllers/clienteServiciosController");
const router = (0, express_1.Router)();
router.get('/buscar', clienteServiciosController_1.buscarServiciosCliente);
router.get('/', clienteServiciosController_1.consultarServicios);
router.get('/filtrar', clienteServiciosController_1.filtrarServicios);
exports.default = router;
//# sourceMappingURL=clienteServicios.js.map