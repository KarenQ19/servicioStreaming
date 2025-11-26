"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const database_1 = require("../utils/database");
const auth_1 = require("../utils/auth");
class AuthService {
    static async registerClient(data) {
        const existingClient = await database_1.prisma.cliente.findUnique({
            where: { email: data.email },
        });
        if (existingClient) {
            throw new Error('Email already registered');
        }
        const hashedPassword = await (0, auth_1.hashPassword)(data.password);
        const client = await database_1.prisma.cliente.create({
            data: {
                nombre: data.nombre,
                email: data.email,
                password: hashedPassword,
                telefono: data.telefono,
            },
        });
        const token = (0, auth_1.generateToken)({
            userId: client.id,
            email: client.email,
            role: 'CLIENTE',
        });
        return {
            success: true,
            token,
            user: {
                id: client.id,
                email: client.email,
                nombre: client.nombre,
                role: 'CLIENTE',
            },
        };
    }
    static async loginClient(credentials) {
        const client = await database_1.prisma.cliente.findUnique({
            where: { email: credentials.email },
        });
        if (!client) {
            throw new Error('Invalid email or password');
        }
        if (!client.activo) {
            throw new Error('Account is deactivated');
        }
        const isValidPassword = await (0, auth_1.comparePassword)(credentials.password, client.password);
        if (!isValidPassword) {
            throw new Error('Invalid email or password');
        }
        const token = (0, auth_1.generateToken)({
            userId: client.id,
            email: client.email,
            role: 'CLIENTE',
        });
        return {
            success: true,
            token,
            user: {
                id: client.id,
                email: client.email,
                nombre: client.nombre,
                role: 'CLIENTE',
            },
        };
    }
    static async loginAdmin(credentials) {
        const admin = await database_1.prisma.administrador.findUnique({
            where: { email: credentials.email },
        });
        if (!admin) {
            throw new Error('Invalid email or password');
        }
        if (!admin.activo) {
            throw new Error('Account is deactivated');
        }
        const isValidPassword = await (0, auth_1.comparePassword)(credentials.password, admin.password);
        if (!isValidPassword) {
            throw new Error('Invalid email or password');
        }
        const token = (0, auth_1.generateToken)({
            userId: admin.id,
            email: admin.email,
            role: 'ADMINISTRADOR',
        });
        return {
            success: true,
            token,
            user: {
                id: admin.id,
                email: admin.email,
                nombre: admin.nombre,
                role: 'ADMINISTRADOR',
            },
        };
    }
    static async getUserProfile(userId, role) {
        if (role === 'CLIENTE') {
            const client = await database_1.prisma.cliente.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    nombre: true,
                    email: true,
                    telefono: true,
                    activo: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
            if (!client) {
                throw new Error('Client not found');
            }
            return { ...client, role: 'CLIENTE' };
        }
        else {
            const admin = await database_1.prisma.administrador.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    nombre: true,
                    email: true,
                    activo: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
            if (!admin) {
                throw new Error('Administrator not found');
            }
            return { ...admin, role: 'ADMINISTRADOR' };
        }
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=authService.js.map