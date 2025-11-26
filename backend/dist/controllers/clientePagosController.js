"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientePagosController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
exports.clientePagosController = {
    seleccionarMetodoPago: async (req, res) => {
        try {
            const { metodoPagoId, establecerComoPreferido = true } = req.body;
            const clienteId = req.user?.id;
            if (!clienteId) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }
            const metodoPago = await prisma.metodoPago.findFirst({
                where: {
                    id: metodoPagoId,
                    disponible: true
                }
            });
            if (!metodoPago) {
                return res.status(404).json({
                    success: false,
                    message: 'Método de pago no encontrado o no disponible'
                });
            }
            const cliente = await prisma.cliente.findUnique({
                where: { id: clienteId }
            });
            if (!cliente) {
                return res.status(404).json({
                    success: false,
                    message: 'Cliente no encontrado'
                });
            }
            let clienteActualizado = cliente;
            const historialReciente = await prisma.pago.findMany({
                where: {
                    clienteId,
                    metodoPagoId
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    id: true,
                    monto: true,
                    estado: true,
                    createdAt: true,
                    descripcion: true
                }
            });
            return res.json({
                success: true,
                data: {
                    cliente: {
                        id: clienteActualizado.id,
                        nombre: clienteActualizado.nombre,
                        email: clienteActualizado.email
                    },
                    metodoPagoSeleccionado: metodoPago,
                    esNuevoPreferido: establecerComoPreferido,
                    metodoPagoAnterior: null,
                    historialReciente,
                    estadisticas: {
                        totalPagosConEsteMetodo: historialReciente.length,
                        ultimoUso: historialReciente[0]?.createdAt || null
                    }
                },
                message: establecerComoPreferido
                    ? 'Método de pago seleccionado como preferido exitosamente'
                    : 'Método de pago seleccionado exitosamente'
            });
        }
        catch (error) {
            console.error('Error al seleccionar método de pago:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    },
    consultarHistorialPagos: async (req, res) => {
        try {
            const clienteId = req.user?.id;
            const { page = 1, limit = 10, estado, metodoPagoId, fechaInicio, fechaFin, ordenarPor = 'createdAt', orden = 'desc' } = req.query;
            if (!clienteId) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }
            const filtros = { clienteId };
            if (estado) {
                filtros.estado = estado;
            }
            if (metodoPagoId) {
                filtros.metodoPagoId = metodoPagoId;
            }
            if (fechaInicio || fechaFin) {
                filtros.createdAt = {};
                if (fechaInicio) {
                    filtros.createdAt.gte = new Date(fechaInicio);
                }
                if (fechaFin) {
                    filtros.createdAt.lte = new Date(fechaFin);
                }
            }
            const skip = (Number(page) - 1) * Number(limit);
            const [pagos, totalPagos] = await Promise.all([
                prisma.pago.findMany({
                    where: filtros,
                    include: {
                        metodoPago: true,
                        carrito: {
                            include: {
                                items: {
                                    include: {
                                        servicio: {
                                            select: {
                                                id: true,
                                                nombre: true,
                                                precio: true,
                                                categoria: true
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        suscripcion: {
                            include: {
                                servicio: {
                                    select: {
                                        id: true,
                                        nombre: true,
                                        precio: true,
                                        categoria: true
                                    }
                                }
                            }
                        },
                        qr: {
                            select: {
                                id: true,
                                codigo: true,
                                estado: true,
                                createdAt: true,
                                expiresAt: true
                            }
                        }
                    },
                    orderBy: { [ordenarPor]: orden },
                    skip,
                    take: Number(limit)
                }),
                prisma.pago.count({ where: filtros })
            ]);
            const estadisticas = await prisma.pago.aggregate({
                where: { clienteId },
                _sum: { monto: true },
                _count: { _all: true }
            });
            const estadisticasPorEstado = await prisma.pago.groupBy({
                by: ['estado'],
                where: { clienteId },
                _count: { _all: true },
                _sum: { monto: true }
            });
            const metodosMasUsados = await prisma.pago.groupBy({
                by: ['metodoPagoId'],
                where: { clienteId },
                _count: { metodoPagoId: true },
                _sum: { monto: true },
                orderBy: { _count: { metodoPagoId: 'desc' } },
                take: 5
            });
            const metodosInfo = await prisma.metodoPago.findMany({
                where: {
                    id: { in: metodosMasUsados.map((m) => m.metodoPagoId) }
                }
            });
            const metodosMasUsadosConInfo = metodosMasUsados.map((metodo) => ({
                ...metodo,
                metodoPago: metodosInfo.find((m) => m.id === metodo.metodoPagoId)
            }));
            const totalPaginas = Math.ceil(totalPagos / Number(limit));
            const paginaActual = Number(page);
            return res.json({
                success: true,
                data: {
                    pagos,
                    paginacion: {
                        paginaActual,
                        totalPaginas,
                        totalRegistros: totalPagos,
                        registrosPorPagina: Number(limit),
                        hayPaginaAnterior: paginaActual > 1,
                        hayPaginaSiguiente: paginaActual < totalPaginas
                    },
                    estadisticas: {
                        totalPagos: estadisticas._count || 0,
                        montoTotal: estadisticas._sum.monto || 0,
                        promedioPorPago: (estadisticas._count && estadisticas._sum.monto)
                            ? Number(estadisticas._sum.monto) / Number(estadisticas._count)
                            : 0,
                        estadisticasPorEstado: estadisticasPorEstado.map((est) => ({
                            estado: est.estado,
                            cantidad: est._count,
                            montoTotal: est._sum.monto || 0
                        })),
                        metodosMasUsados: metodosMasUsadosConInfo
                    },
                    filtrosAplicados: {
                        estado,
                        metodoPagoId,
                        fechaInicio,
                        fechaFin,
                        ordenarPor,
                        orden
                    }
                }
            });
        }
        catch (error) {
            console.error('Error al consultar historial de pagos:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    },
    obtenerResumenPagos: async (req, res) => {
        try {
            const clienteId = req.user?.id;
            if (!clienteId) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }
            const [totalPagos, pagosPendientes, pagosCompletados, pagosFallidos, pagosReembolsados] = await Promise.all([
                prisma.pago.aggregate({
                    where: { clienteId },
                    _sum: { monto: true },
                    _count: { _all: true }
                }),
                prisma.pago.aggregate({
                    where: { clienteId, estado: 'PENDIENTE' },
                    _sum: { monto: true },
                    _count: { _all: true }
                }),
                prisma.pago.aggregate({
                    where: { clienteId, estado: 'COMPLETADO' },
                    _sum: { monto: true },
                    _count: { _all: true }
                }),
                prisma.pago.aggregate({
                    where: { clienteId, estado: 'FALLIDO' },
                    _sum: { monto: true },
                    _count: { _all: true }
                }),
                prisma.pago.aggregate({
                    where: { clienteId, estado: 'REEMBOLSADO' },
                    _sum: { monto: true },
                    _count: { _all: true }
                })
            ]);
            const pagosRecientes = await prisma.pago.findMany({
                where: { clienteId },
                include: {
                    metodoPago: true
                },
                orderBy: { createdAt: 'desc' },
                take: 5
            });
            const cliente = await prisma.cliente.findUnique({
                where: { id: clienteId }
            });
            return res.json({
                success: true,
                data: {
                    resumenGeneral: {
                        totalPagos: totalPagos._count || 0,
                        montoTotal: totalPagos._sum.monto || 0,
                        promedioMensual: 0
                    },
                    estadosPagos: {
                        pendientes: {
                            cantidad: pagosPendientes._count || 0,
                            monto: pagosPendientes._sum.monto || 0
                        },
                        completados: {
                            cantidad: pagosCompletados._count || 0,
                            monto: pagosCompletados._sum.monto || 0
                        },
                        fallidos: {
                            cantidad: pagosFallidos._count || 0,
                            monto: pagosFallidos._sum.monto || 0
                        },
                        reembolsados: {
                            cantidad: pagosReembolsados._count || 0,
                            monto: pagosReembolsados._sum.monto || 0
                        }
                    },
                    pagosRecientes,
                    metodoPagoPreferido: null,
                    alertas: {
                        tienePagosPendientes: (pagosPendientes._count._all || 0) > 0,
                        tienePagosFallidos: (pagosFallidos._count._all || 0) > 0,
                        necesitaMetodoPreferido: false
                    }
                }
            });
        }
        catch (error) {
            console.error('Error al obtener resumen de pagos:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
};
//# sourceMappingURL=clientePagosController.js.map