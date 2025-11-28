"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const adminPagosController_1 = require("../controllers/adminPagosController");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, auth_1.authorizeAdmin);
router.get('/', adminPagosController_1.adminPagosController.listarPagos);
exports.default = router;
//# sourceMappingURL=adminPagos.js.map