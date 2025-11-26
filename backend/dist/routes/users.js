"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.put('/profile', (0, validation_1.validate)(validation_1.updateProfileSchema), userController_1.UserController.updateProfile);
router.get('/profile/detailed', auth_1.authorizeClient, userController_1.UserController.getDetailedProfile);
router.delete('/profile', auth_1.authorizeClient, userController_1.UserController.deactivateAccount);
router.get('/', auth_1.authorizeAdmin, userController_1.UserController.getAllClients);
router.put('/:id/reactivate', auth_1.authorizeAdmin, userController_1.UserController.reactivateClient);
exports.default = router;
//# sourceMappingURL=users.js.map