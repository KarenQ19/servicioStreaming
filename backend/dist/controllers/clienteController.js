"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.obtenerMetricasCliente = exports.obtenerPerfil = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const obtenerPerfil = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }
        const cliente = await prisma.cliente.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                nombre: true,
                telefono: true,
                createdAt: true
            }
        });
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        return res.json(cliente);
    }
    catch (error) {
        console.error('Error al obtener perfil del cliente:', error);
        return res.status(500).json({ error: 'Error al obtener perfil del cliente' });
    }
};
exports.obtenerPerfil = obtenerPerfil;
const obtenerMetricasCliente = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }
        const suscripciones = await prisma.suscripcion.findMany({
            where: {
                clienteId: userId,
                estado: 'ACTIVA'
            },
            include: {
                servicio: true,
                pagos: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 5
                }
            }
        });
        const gastoMensual = suscripciones.reduce((total, sub) => total + sub.servicio.precio, 0);
        const pagos = await prisma.pago.findMany({
            where: {
                clienteId: userId
            }
        });
        const gastoTotal = pagos.reduce((total, pago) => total + pago.monto, 0);
        const serviciosRecomendados = await prisma.servicio.findMany({
            where: {
                NOT: {
                    suscripciones: {
                        some: {
                            clienteId: userId,
                            estado: 'ACTIVA'
                        }
                    }
                },
                disponible: true
            },
            take: 5
        });
        const ultimosPagos = await prisma.pago.findMany({
            where: {
                clienteId: userId
            },
            include: {
                suscripcion: {
                    include: {
                        servicio: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 5
        });
        return res.json({
            suscripcionesActivas: suscripciones.length,
            gastoMensual,
            gastoTotal,
            ultimosPagos,
            serviciosRecomendados
        });
    }
    catch (error) {
        console.error('Error al obtener métricas del cliente:', error);
        return res.status(500).json({ error: 'Error al obtener métricas del cliente' });
    }
};
exports.obtenerMetricasCliente = obtenerMetricasCliente;
//# sourceMappingURL=clienteController.js.map