"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportesController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
exports.reportesController = {
    consultarReportesVentas: async (req, res) => {
        try {
            const { fechaInicio, fechaFin, periodo = 'mensual', servicio, cliente } = req.query;
            const fechaFinDate = fechaFin ? new Date(fechaFin) : new Date();
            const fechaInicioDate = fechaInicio
                ? new Date(fechaInicio)
                : new Date(fechaFinDate.getTime() - 30 * 24 * 60 * 60 * 1000);
            const whereBase = {
                createdAt: {
                    gte: fechaInicioDate,
                    lte: fechaFinDate
                },
                estado: 'COMPLETADO'
            };
            if (servicio) {
                whereBase.suscripcion = {
                    servicioId: servicio
                };
            }
            if (cliente) {
                whereBase.clienteId = cliente;
            }
            const [ventasTotales, ventasPorPeriodo, ventasPorServicio, ventasPorCliente, metodosPopulares, estadisticasGenerales] = await Promise.all([
                prisma.pago.aggregate({
                    where: whereBase,
                    _sum: { monto: true },
                    _count: { id: true },
                    _avg: { monto: true }
                }),
                prisma.pago.groupBy({
                    by: ['createdAt'],
                    where: whereBase,
                    _sum: { monto: true },
                    _count: { id: true },
                    orderBy: { createdAt: 'asc' }
                }),
                prisma.pago.findMany({
                    where: whereBase,
                    include: {
                        suscripcion: {
                            include: {
                                servicio: {
                                    select: {
                                        id: true,
                                        nombre: true,
                                        categoria: true,
                                        precio: true
                                    }
                                }
                            }
                        }
                    }
                }),
                prisma.pago.groupBy({
                    by: ['clienteId'],
                    where: whereBase,
                    _sum: { monto: true },
                    _count: { id: true },
                    orderBy: { _sum: { monto: 'desc' } },
                    take: 10
                }),
                prisma.pago.groupBy({
                    by: ['metodoPagoId'],
                    where: whereBase,
                    _count: { id: true },
                    _sum: { monto: true },
                    orderBy: { _count: { id: 'desc' } }
                }),
                prisma.$transaction([
                    prisma.cliente.count({
                        where: {
                            createdAt: {
                                gte: fechaInicioDate,
                                lte: fechaFinDate
                            }
                        }
                    }),
                    prisma.suscripcion.count({
                        where: {
                            createdAt: {
                                gte: fechaInicioDate,
                                lte: fechaFinDate
                            }
                        }
                    }),
                    prisma.suscripcion.count({
                        where: {
                            estado: 'CANCELADA',
                            updatedAt: {
                                gte: fechaInicioDate,
                                lte: fechaFinDate
                            }
                        }
                    }),
                    prisma.pago.count({
                        where: {
                            createdAt: {
                                gte: new Date(new Date().setHours(0, 0, 0, 0)),
                                lte: new Date(new Date().setHours(23, 59, 59, 999))
                            },
                            estado: 'COMPLETADO'
                        }
                    }),
                    prisma.pago.count({
                        where: {
                            createdAt: {
                                gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                                lte: new Date()
                            },
                            estado: 'COMPLETADO'
                        }
                    }),
                    prisma.pago.aggregate({
                        where: {
                            createdAt: {
                                gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                                lte: new Date()
                            },
                            estado: 'COMPLETADO'
                        },
                        _sum: { monto: true }
                    }),
                    prisma.pago.aggregate({
                        where: {
                            createdAt: {
                                gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
                                lte: new Date(new Date().getFullYear(), new Date().getMonth(), 0)
                            },
                            estado: 'COMPLETADO'
                        },
                        _sum: { monto: true }
                    })
                ])
            ]);
            const ventasServicioMap = new Map();
            ventasPorServicio.forEach(pago => {
                if (pago.suscripcion?.servicio) {
                    const servicio = pago.suscripcion.servicio;
                    const key = servicio.id;
                    if (!ventasServicioMap.has(key)) {
                        ventasServicioMap.set(key, {
                            servicio: servicio,
                            totalVentas: 0,
                            cantidadVentas: 0,
                            ingresos: 0
                        });
                    }
                    const data = ventasServicioMap.get(key);
                    data.cantidadVentas += 1;
                    data.ingresos += Number(pago.monto);
                    ventasServicioMap.set(key, data);
                }
            });
            const clientesIds = ventasPorCliente.map(v => v.clienteId);
            const clientesInfo = await prisma.cliente.findMany({
                where: { id: { in: clientesIds } },
                select: {
                    id: true,
                    nombre: true,
                    email: true
                }
            });
            const topClientes = ventasPorCliente.map(venta => {
                const cliente = clientesInfo.find(c => c.id === venta.clienteId);
                return {
                    cliente,
                    totalGastado: Number(venta._sum.monto || 0),
                    cantidadCompras: venta._count.id
                };
            });
            const metodosIds = metodosPopulares.map(m => m.metodoPagoId).filter(Boolean);
            const metodosInfo = await prisma.metodoPago.findMany({
                where: { id: { in: metodosIds } },
                select: {
                    id: true,
                    nombre: true,
                    tipo: true,
                    descripcion: true
                }
            });
            const metodosConInfo = metodosPopulares.map(metodo => {
                const info = metodosInfo.find(m => m.id === metodo.metodoPagoId);
                return {
                    metodo: info,
                    cantidadUsos: metodo._count.id,
                    montoTotal: Number(metodo._sum.monto || 0)
                };
            });
            const ventasPorPeriodoProcessed = exports.reportesController.procesarVentasPorPeriodo(ventasPorPeriodo, periodo, fechaInicioDate, fechaFinDate);
            const ingresosMesActual = Number(estadisticasGenerales[5]._sum.monto || 0);
            const ingresosMesAnterior = Number(estadisticasGenerales[6]._sum.monto || 0);
            const crecimientoMensual = ingresosMesAnterior > 0
                ? ((ingresosMesActual - ingresosMesAnterior) / ingresosMesAnterior * 100)
                : 0;
            res.json({
                success: true,
                data: {
                    resumen: {
                        ingresoTotal: ingresosMesActual,
                        cantidadVentas: ventasTotales._count.id,
                        ticketPromedio: Number(ventasTotales._avg.monto || 0),
                        periodo: {
                            inicio: fechaInicioDate.toISOString(),
                            fin: fechaFinDate.toISOString()
                        }
                    },
                    ventasPorPeriodo: ventasPorPeriodoProcessed,
                    ventasPorServicio: Array.from(ventasServicioMap.values()).map(item => ({
                        ...item,
                        nombre: item.servicio?.nombre || 'Desconocido',
                        cantidad: item.cantidadVentas
                    })),
                    topClientes: topClientes.map(item => ({
                        ...item,
                        nombre: item.cliente?.nombre || 'Desconocido',
                        total: item.totalGastado
                    })),
                    metodosPopulares: metodosConInfo,
                    estadisticas: {
                        nuevosClientes: estadisticasGenerales[0],
                        nuevasSuscripciones: estadisticasGenerales[1],
                        suscripcionesCanceladas: estadisticasGenerales[2],
                        ventasHoy: estadisticasGenerales[3],
                        ventasMes: estadisticasGenerales[4],
                        ingresosTotales: Number(estadisticasGenerales[5]._sum.monto || 0),
                        crecimientoMensual: Math.round(crecimientoMensual * 100) / 100,
                        tasaRetencion: estadisticasGenerales[1] > 0
                            ? ((estadisticasGenerales[1] - estadisticasGenerales[2]) / estadisticasGenerales[1] * 100).toFixed(2)
                            : 0
                    }
                }
            });
        }
        catch (error) {
            console.error('Error al generar reporte de ventas:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    },
    consultarReportesActividad: async (req, res) => {
        try {
            const { fechaInicio, fechaFin, tipo = 'general' } = req.query;
            const fechaFinDate = fechaFin ? new Date(fechaFin) : new Date();
            const fechaInicioDate = fechaInicio
                ? new Date(fechaInicio)
                : new Date(fechaFinDate.getTime() - 30 * 24 * 60 * 60 * 1000);
            const whereBase = {
                createdAt: {
                    gte: fechaInicioDate,
                    lte: fechaFinDate
                }
            };
            const [totalUsuarios, usuariosActivos, registrosPorDia, carritosCreados, carritosConvertidos, serviciosPopulares, serviciosEnCarrito, pagosPorEstado, pagosPorDia, totalServicios, suscripcionesActivas, pagosCompletados, carritosActivos] = await Promise.all([
                prisma.cliente.count(),
                prisma.cliente.count({
                    where: {
                        OR: [
                            { suscripciones: { some: whereBase } },
                            { pagos: { some: whereBase } },
                            { carritos: { some: whereBase } }
                        ]
                    }
                }),
                prisma.cliente.groupBy({
                    by: ['createdAt'],
                    where: whereBase,
                    _count: { id: true },
                    orderBy: { createdAt: 'asc' }
                }),
                prisma.carrito.count({ where: whereBase }),
                prisma.carrito.count({
                    where: {
                        ...whereBase,
                        pagos: {
                            some: {
                                estado: 'COMPLETADO'
                            }
                        }
                    }
                }),
                prisma.servicio.findMany({
                    include: {
                        _count: {
                            select: {
                                suscripciones: {
                                    where: whereBase
                                }
                            }
                        }
                    },
                    orderBy: {
                        suscripciones: {
                            _count: 'desc'
                        }
                    },
                    take: 5
                }),
                prisma.servicio.findMany({
                    include: {
                        _count: {
                            select: {
                                carritoItems: {
                                    where: {
                                        carrito: whereBase
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        carritoItems: {
                            _count: 'desc'
                        }
                    },
                    take: 5
                }),
                prisma.pago.groupBy({
                    by: ['estado'],
                    where: whereBase,
                    _count: { id: true },
                    _sum: { monto: true }
                }),
                prisma.pago.groupBy({
                    by: ['createdAt'],
                    where: whereBase,
                    _count: { id: true },
                    _sum: { monto: true },
                    orderBy: { createdAt: 'asc' }
                }),
                prisma.servicio.count(),
                prisma.suscripcion.count({ where: { estado: 'ACTIVA' } }),
                prisma.pago.count({ where: { estado: 'COMPLETADO' } }),
                prisma.carrito.count({ where: { activo: true } })
            ]);
            const tasaActividad = totalUsuarios > 0 ? ((usuariosActivos / totalUsuarios) * 100).toFixed(2) : '0.00';
            const tasaConversion = carritosCreados > 0 ? ((carritosConvertidos / carritosCreados) * 100).toFixed(2) : '0.00';
            const reporteActividad = {
                resumen: {
                    periodo: {
                        inicio: fechaInicioDate,
                        fin: fechaFinDate
                    },
                    metricas: {
                        usuariosActivos,
                        totalUsuarios,
                        tasaActividad: `${tasaActividad}%`,
                        carritosCreados,
                        carritosConvertidos,
                        tasaConversion: `${tasaConversion}%`
                    }
                },
                usuarios: {
                    registrosPorDia: registrosPorDia.map(registro => ({
                        createdAt: registro.createdAt,
                        _count: { id: registro._count.id }
                    })),
                    usuariosActivos,
                    totalUsuarios
                },
                servicios: {
                    masPopulares: serviciosPopulares.map(servicio => ({
                        servicio: {
                            id: servicio.id,
                            nombre: servicio.nombre,
                            descripcion: servicio.descripcion,
                            precio: servicio.precio,
                            categoria: servicio.categoria,
                            disponible: servicio.disponible,
                            createdAt: servicio.createdAt,
                            updatedAt: servicio.updatedAt
                        },
                        suscripciones: servicio._count.suscripciones
                    })),
                    masAgregadosCarrito: serviciosEnCarrito.map(servicio => ({
                        servicio: {
                            id: servicio.id,
                            nombre: servicio.nombre,
                            descripcion: servicio.descripcion,
                            precio: servicio.precio,
                            categoria: servicio.categoria,
                            disponible: servicio.disponible,
                            createdAt: servicio.createdAt,
                            updatedAt: servicio.updatedAt
                        },
                        vecesAgregado: servicio._count.carritoItems,
                        cantidadTotal: servicio._count.carritoItems
                    }))
                },
                pagos: {
                    porEstado: pagosPorEstado.map(pago => ({
                        estado: pago.estado,
                        cantidad: pago._count.id,
                        monto: Number(pago._sum.monto || 0)
                    })),
                    porDia: pagosPorDia.map(pago => ({
                        fecha: pago.createdAt,
                        cantidad: pago._count.id,
                        monto: Number(pago._sum.monto || 0)
                    }))
                },
                carritos: {
                    creados: carritosCreados,
                    convertidos: carritosConvertidos,
                    tasaConversion: `${tasaConversion}%`,
                    itemsPopulares: serviciosEnCarrito.slice(0, 5).map(servicio => ({
                        servicio: {
                            id: servicio.id,
                            nombre: servicio.nombre,
                            descripcion: servicio.descripcion,
                            precio: servicio.precio,
                            categoria: servicio.categoria,
                            disponible: servicio.disponible,
                            createdAt: servicio.createdAt,
                            updatedAt: servicio.updatedAt
                        },
                        cantidadAgregada: servicio._count.carritoItems
                    }))
                },
                estadisticasGenerales: {
                    totalClientes: totalUsuarios,
                    totalServicios,
                    suscripcionesActivas,
                    pagosCompletados,
                    carritosActivos
                }
            };
            res.status(200).json({
                success: true,
                data: reporteActividad,
                message: 'Reporte de actividad obtenido exitosamente'
            });
        }
        catch (error) {
            console.error('Error al obtener reporte de actividad:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al obtener reporte de actividad'
            });
        }
    },
    procesarVentasPorPeriodo: (ventas, periodo, fechaInicio, fechaFin) => {
        const ventasMap = new Map();
        ventas.forEach(venta => {
            let key;
            const fecha = new Date(venta.createdAt);
            switch (periodo) {
                case 'diario':
                    key = fecha.toISOString().split('T')[0];
                    break;
                case 'semanal':
                    const inicioSemana = new Date(fecha);
                    inicioSemana.setDate(fecha.getDate() - fecha.getDay());
                    key = inicioSemana.toISOString().split('T')[0];
                    break;
                case 'mensual':
                    key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
                    break;
                case 'anual':
                    key = fecha.getFullYear().toString();
                    break;
                default:
                    key = fecha.toISOString().split('T')[0];
            }
            if (!ventasMap.has(key)) {
                ventasMap.set(key, {
                    periodo: key,
                    ingresos: 0,
                    cantidadVentas: 0
                });
            }
            const data = ventasMap.get(key);
            data.ingresos += Number(venta._sum.monto || 0);
            data.cantidadVentas += venta._count.id;
            ventasMap.set(key, data);
        });
        return Array.from(ventasMap.values()).sort((a, b) => a.periodo.localeCompare(b.periodo));
    }
};
//# sourceMappingURL=reportesController.js.map