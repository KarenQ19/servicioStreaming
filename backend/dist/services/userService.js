"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const database_1 = require("../utils/database");
const auth_1 = require("../utils/auth");
class UserService {
    static async updateClientProfile(userId, data) {
        const updateData = {};
        if (data.nombre)
            updateData.nombre = data.nombre;
        if (data.telefono)
            updateData.telefono = data.telefono;
        if (data.password) {
            updateData.password = await (0, auth_1.hashPassword)(data.password);
        }
        const updatedClient = await database_1.prisma.cliente.update({
            where: { id: userId },
            data: updateData,
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
        return { ...updatedClient, role: 'CLIENTE' };
    }
    static async updateAdminProfile(userId, data) {
        const updateData = {};
        if (data.nombre)
            updateData.nombre = data.nombre;
        if (data.password) {
            updateData.password = await (0, auth_1.hashPassword)(data.password);
        }
        const updatedAdmin = await database_1.prisma.administrador.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                nombre: true,
                email: true,
                activo: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return { ...updatedAdmin, role: 'ADMINISTRADOR' };
    }
    static async getClientWithSubscriptions(userId) {
        const client = await database_1.prisma.cliente.findUnique({
            where: { id: userId },
            include: {
                suscripciones: {
                    include: {
                        servicio: {
                            select: {
                                id: true,
                                nombre: true,
                                descripcion: true,
                                precio: true,
                                categoria: true,
                                disponible: true,
                            },
                        },
                    },
                },
                carritos: {
                    include: {
                        items: {
                            include: {
                                servicio: {
                                    select: {
                                        id: true,
                                        nombre: true,
                                        precio: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!client) {
            throw new Error('Client not found');
        }
        return client;
    }
    static async deactivateClient(userId) {
        const client = await database_1.prisma.cliente.update({
            where: { id: userId },
            data: { activo: false },
            select: {
                id: true,
                nombre: true,
                email: true,
                activo: true,
            },
        });
        return client;
    }
    static async reactivateClient(userId) {
        const client = await database_1.prisma.cliente.update({
            where: { id: userId },
            data: { activo: true },
            select: {
                id: true,
                nombre: true,
                email: true,
                activo: true,
            },
        });
        return client;
    }
    static async getAllClients(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [clients, total] = await Promise.all([
            database_1.prisma.cliente.findMany({
                skip,
                take: limit,
                select: {
                    id: true,
                    nombre: true,
                    email: true,
                    telefono: true,
                    activo: true,
                    createdAt: true,
                    _count: {
                        select: {
                            suscripciones: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            }),
            database_1.prisma.cliente.count(),
        ]);
        return {
            clients,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
}
exports.UserService = UserService;
//# sourceMappingURL=userService.js.map