"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../utils/validation");
const passport_1 = __importDefault(require("../config/passport"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = (0, express_1.Router)();
router.post('/register', (0, validation_1.validate)(validation_1.registerSchema), authController_1.AuthController.register);
router.post('/login', (0, validation_1.validate)(validation_1.loginSchema), authController_1.AuthController.loginClient);
router.post('/admin/login', (0, validation_1.validate)(validation_1.loginSchema), authController_1.AuthController.loginAdmin);
router.get('/google', passport_1.default.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport_1.default.authenticate('google', { failureRedirect: '/login?error=google_auth_failed' }), (req, res) => {
    const user = req.user;
    const token = jsonwebtoken_1.default.sign({
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        proveedor: user.proveedor
    }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
});
router.get('/facebook', passport_1.default.authenticate('facebook', { scope: ['email'] }));
router.get('/facebook/callback', passport_1.default.authenticate('facebook', { failureRedirect: '/login?error=facebook_auth_failed' }), (req, res) => {
    const user = req.user;
    const token = jsonwebtoken_1.default.sign({
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        proveedor: user.proveedor
    }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
});
router.post('/logout', auth_1.authenticate, authController_1.AuthController.logout);
router.get('/profile', auth_1.authenticate, authController_1.AuthController.getProfile);
router.get('/verify', auth_1.authenticate, authController_1.AuthController.verifyToken);
exports.default = router;
//# sourceMappingURL=auth.js.map