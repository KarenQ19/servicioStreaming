"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const userService_1 = require("../services/userService");
const response_1 = require("../utils/response");
class UserController {
    static async updateProfile(req, res) {
        try {
            if (!req.user) {
                return (0, response_1.sendError)(res, 'User not authenticated', 401);
            }
            const data = req.body;
            let updatedProfile;
            if (req.user.role === 'CLIENTE') {
                updatedProfile = await userService_1.UserService.updateClientProfile(req.user.id, data);
            }
            else if (req.user.role === 'ADMINISTRADOR') {
                updatedProfile = await userService_1.UserService.updateAdminProfile(req.user.id, data);
            }
            else {
                return (0, response_1.sendError)(res, 'Invalid user role', 400);
            }
            return (0, response_1.sendSuccess)(res, updatedProfile, 'Profile updated successfully');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update profile';
            return (0, response_1.sendError)(res, message, 400);
        }
    }
    static async getDetailedProfile(req, res) {
        try {
            if (!req.user) {
                return (0, response_1.sendError)(res, 'User not authenticated', 401);
            }
            if (req.user.role !== 'CLIENTE') {
                return (0, response_1.sendError)(res, 'Access denied. Only clients can access this endpoint', 403);
            }
            const profile = await userService_1.UserService.getClientWithSubscriptions(req.user.id);
            return (0, response_1.sendSuccess)(res, profile, 'Detailed profile retrieved successfully');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to get detailed profile';
            return (0, response_1.sendError)(res, message, 400);
        }
    }
    static async deactivateAccount(req, res) {
        try {
            if (!req.user) {
                return (0, response_1.sendError)(res, 'User not authenticated', 401);
            }
            if (req.user.role !== 'CLIENTE') {
                return (0, response_1.sendError)(res, 'Access denied. Only clients can deactivate their accounts', 403);
            }
            const result = await userService_1.UserService.deactivateClient(req.user.id);
            return (0, response_1.sendSuccess)(res, result, 'Account deactivated successfully');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to deactivate account';
            return (0, response_1.sendError)(res, message, 400);
        }
    }
    static async getAllClients(req, res) {
        try {
            if (!req.user) {
                return (0, response_1.sendError)(res, 'User not authenticated', 401);
            }
            if (req.user.role !== 'ADMINISTRADOR') {
                return (0, response_1.sendError)(res, 'Access denied. Admin privileges required', 403);
            }
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await userService_1.UserService.getAllClients(page, limit);
            return (0, response_1.sendSuccess)(res, result, 'Clients retrieved successfully');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to get clients';
            return (0, response_1.sendError)(res, message, 400);
        }
    }
    static async reactivateClient(req, res) {
        try {
            if (!req.user) {
                return (0, response_1.sendError)(res, 'User not authenticated', 401);
            }
            if (req.user.role !== 'ADMINISTRADOR') {
                return (0, response_1.sendError)(res, 'Access denied. Admin privileges required', 403);
            }
            const { id } = req.params;
            const result = await userService_1.UserService.reactivateClient(id);
            return (0, response_1.sendSuccess)(res, result, 'Client reactivated successfully');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to reactivate client';
            return (0, response_1.sendError)(res, message, 400);
        }
    }
}
exports.UserController = UserController;
//# sourceMappingURL=userController.js.map