"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeClientOrAdmin = exports.authorizeAdmin = exports.authorizeClient = exports.authenticate = void 0;
const auth_1 = require("../utils/auth");
const response_1 = require("../utils/response");
const authenticate = (req, res, next) => {
    try {
        const token = (0, auth_1.extractTokenFromHeader)(req.headers.authorization);
        if (!token) {
            (0, response_1.sendError)(res, 'Access token is required', 401);
            return;
        }
        const decoded = (0, auth_1.verifyToken)(token);
        req.user = {
            id: decoded.userId,
            email: decoded.email,
            nombre: '',
            role: decoded.role
        };
        next();
    }
    catch (error) {
        (0, response_1.sendError)(res, 'Invalid or expired token', 401);
    }
};
exports.authenticate = authenticate;
const authorizeClient = (req, res, next) => {
    if (!req.user) {
        (0, response_1.sendError)(res, 'Authentication required', 401);
        return;
    }
    const role = req.user.role;
    if (role !== 'CLIENTE') {
        (0, response_1.sendError)(res, 'Access denied. Client role required', 403);
        return;
    }
    next();
};
exports.authorizeClient = authorizeClient;
const authorizeAdmin = (req, res, next) => {
    if (!req.user) {
        (0, response_1.sendError)(res, 'Authentication required', 401);
        return;
    }
    if (req.user.role !== 'ADMINISTRADOR') {
        (0, response_1.sendError)(res, 'Access denied. Administrator role required', 403);
        return;
    }
    next();
};
exports.authorizeAdmin = authorizeAdmin;
const authorizeClientOrAdmin = (req, res, next) => {
    if (!req.user) {
        (0, response_1.sendError)(res, 'Authentication required', 401);
        return;
    }
    if (req.user.role !== 'CLIENTE' && req.user.role !== 'ADMINISTRADOR') {
        (0, response_1.sendError)(res, 'Access denied. Client or Administrator role required', 403);
        return;
    }
    next();
};
exports.authorizeClientOrAdmin = authorizeClientOrAdmin;
//# sourceMappingURL=auth.js.map