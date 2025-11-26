"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const catalogoController_1 = require("../controllers/catalogoController");
const router = (0, express_1.Router)();
router.get('/', catalogoController_1.consultarCatalogo);
router.get('/buscar', catalogoController_1.buscarServicio);
router.get('/filtrar', catalogoController_1.filtrarServicios);
router.get('/categorias', catalogoController_1.obtenerCategorias);
exports.default = router;
//# sourceMappingURL=catalogo.js.map