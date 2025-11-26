"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const authService_1 = require("../services/authService");
const response_1 = require("../utils/response");
class AuthController {
    static async register(req, res) {
        try {
            const data = req.body;
            const result = await authService_1.AuthService.registerClient(data);
            return (0, response_1.sendSuccess)(res, result, 'Client registered successfully', 201);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Registration failed';
            return (0, response_1.sendError)(res, message, 400);
        }
    }
    static async loginClient(req, res) {
        try {
            const credentials = req.body;
            const result = await authService_1.AuthService.loginClient(credentials);
            return (0, response_1.sendSuccess)(res, result, 'Login successful');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Login failed';
            return (0, response_1.sendError)(res, message, 401);
        }
    }
    static async loginAdmin(req, res) {
        try {
            const credentials = req.body;
            const result = await authService_1.AuthService.loginAdmin(credentials);
            return (0, response_1.sendSuccess)(res, result, 'Admin login successful');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Admin login failed';
            return (0, response_1.sendError)(res, message, 401);
        }
    }
    static async logout(req, res) {
        try {
            return (0, response_1.sendSuccess)(res, null, 'Logout successful');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Logout failed';
            return (0, response_1.sendError)(res, message, 400);
        }
    }
    static async getProfile(req, res) {
        try {
            if (!req.user) {
                return (0, response_1.sendError)(res, 'User not authenticated', 401);
            }
            const profile = await authService_1.AuthService.getUserProfile(req.user.id, req.user.role);
            return (0, response_1.sendSuccess)(res, profile, 'Profile retrieved successfully');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to get profile';
            return (0, response_1.sendError)(res, message, 400);
        }
    }
    static async verifyToken(req, res) {
        try {
            if (!req.user) {
                return (0, response_1.sendError)(res, 'Token is invalid', 401);
            }
            return (0, response_1.sendSuccess)(res, {
                valid: true,
                user: {
                    id: req.user.id,
                    email: req.user.email,
                    role: req.user.role,
                },
            }, 'Token is valid');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Token verification failed';
            return (0, response_1.sendError)(res, message, 401);
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=authController.js.map