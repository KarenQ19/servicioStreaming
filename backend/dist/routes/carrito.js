"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const carritoController_1 = require("../controllers/carritoController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', carritoController_1.obtenerCarrito);
router.post('/items', carritoController_1.agregarItem);
router.put('/items/:itemId', carritoController_1.actualizarItem);
router.delete('/items/:itemId', carritoController_1.eliminarItem);
router.delete('/', carritoController_1.vaciarCarrito);
exports.default = router;
//# sourceMappingURL=carrito.js.map