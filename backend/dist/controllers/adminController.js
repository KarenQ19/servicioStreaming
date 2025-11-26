"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
exports.adminController = {
    consultarCatalogo: async (req, res) => {
        try {
            const { categoria, disponible, page = '1', limit = '20' } = req.query;
            const take = Math.min(parseInt(limit), 100);
            const skip = (parseInt(page) - 1) * take;
            const where = {};
            if (categoria)
                where.categoria = categoria;
            if (disponible !== undefined)
                where.disponible = disponible === 'true';
            const [servicios, total, estadisticas, estadisticasGenerales] = await Promise.all([
                prisma.servicio.findMany({
                    where,
                    include: {
                        administrador: {
                            select: {
                                id: true,
                                nombre: true,
                                email: true
                            }
                        },
                        _count: {
                            select: {
                                suscripciones: true,
                                carritoItems: true
                            }
                        },
                        suscripciones: {
                            where: { estado: 'ACTIVA' },
                            select: {
                                id: true,
                                fechaInicio: true,
                                clienteId: true
                            }
                        }
                    },
                    orderBy: [
                        { disponible: 'desc' },
                        { createdAt: 'desc' }
                    ],
                    take,
                    skip
                }),
                prisma.servicio.count({ where }),
                prisma.servicio.groupBy({
                    by: ['categoria'],
                    _count: {
                        id: true
                    },
                    _avg: {
                        precio: true
                    }
                }),
                prisma.$transaction([
                    prisma.cliente.count(),
                    prisma.cliente.count({
                        where: {
                            suscripciones: {
                                some: {
                                    estado: 'ACTIVA'
                                }
                            }
                        }
                    }),
                    prisma.carrito.count({
                        where: {
                            activo: true
                        }
                    })
                ])
            ]);
            const serviciosConMetricas = servicios.map(servicio => ({
                ...servicio,
                suscripciones: servicio.suscripciones.map(suscripcion => ({
                    ...suscripcion,
                    fechaInicio: suscripcion.fechaInicio.toISOString()
                })),
                metricas: {
                    suscripcionesActivas: servicio._count.suscripciones,
                    enCarritos: servicio._count.carritoItems,
                    ingresosMensuales: servicio._count.suscripciones * Number(servicio.precio),
                    popularidad: servicio._count.suscripciones + servicio._count.carritoItems
                }
            }));
            res.json({
                success: true,
                data: {
                    servicios: serviciosConMetricas,
                    estadisticas: {
                        totalServicios: total,
                        porCategoria: estadisticas,
                        serviciosActivos: servicios.filter(s => s.disponible).length,
                        serviciosInactivos: servicios.filter(s => !s.disponible).length,
                        totalClientes: estadisticasGenerales[0],
                        clientesActivos: estadisticasGenerales[1],
                        carritosActivos: estadisticasGenerales[2]
                    },
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / take),
                        totalItems: total,
                        itemsPerPage: take,
                        hasNextPage: skip + take < total,
                        hasPrevPage: parseInt(page) > 1
                    }
                }
            });
        }
        catch (error) {
            console.error('Error al consultar catálogo admin:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    },
    agregarServicio: async (req, res) => {
        try {
            const adminId = req.user?.id;
            const { nombre, descripcion, precio, categoria, disponible = true, caracteristicas = {}, logoUrl, logo, logo_url, imagen } = req.body;
            if (!adminId) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }
            if (!nombre || !descripcion || !precio || !categoria) {
                return res.status(400).json({
                    success: false,
                    message: 'Nombre, descripción, precio y categoría son requeridos'
                });
            }
            const servicioExistente = await prisma.servicio.findFirst({
                where: { nombre: { equals: nombre, mode: 'insensitive' } }
            });
            if (servicioExistente) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe un servicio con ese nombre'
                });
            }
            const nuevoServicio = await prisma.servicio.create({
                data: {
                    nombre,
                    descripcion,
                    precio: parseFloat(precio),
                    categoria,
                    disponible,
                    logoUrl: logoUrl || logo || logo_url || imagen || null,
                    caracteristicas,
                    administradorId: adminId
                },
                include: {
                    administrador: {
                        select: {
                            id: true,
                            nombre: true,
                            email: true
                        }
                    }
                }
            });
            res.status(201).json({
                success: true,
                message: 'Servicio creado exitosamente',
                data: nuevoServicio
            });
        }
        catch (error) {
            console.error('Error al agregar servicio:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    },
    actualizarServicio: async (req, res) => {
        try {
            const { id } = req.params;
            const adminId = req.user?.id;
            const { nombre, descripcion, precio, categoria, disponible, caracteristicas, logoUrl, logo, logo_url, imagen } = req.body;
            if (!adminId) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }
            const servicioExistente = await prisma.servicio.findUnique({
                where: { id },
                include: {
                    administrador: true,
                    _count: {
                        select: {
                            suscripciones: true
                        }
                    }
                }
            });
            if (!servicioExistente) {
                return res.status(404).json({
                    success: false,
                    message: 'Servicio no encontrado'
                });
            }
            if (servicioExistente.administradorId !== adminId) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para modificar este servicio'
                });
            }
            const datosActualizacion = {};
            if (nombre !== undefined)
                datosActualizacion.nombre = nombre;
            if (descripcion !== undefined)
                datosActualizacion.descripcion = descripcion;
            if (precio !== undefined)
                datosActualizacion.precio = parseFloat(precio);
            if (categoria !== undefined)
                datosActualizacion.categoria = categoria;
            if (disponible !== undefined)
                datosActualizacion.disponible = disponible;
            if (caracteristicas !== undefined)
                datosActualizacion.caracteristicas = caracteristicas;
            if (logoUrl !== undefined || logo !== undefined || logo_url !== undefined || imagen !== undefined) {
                datosActualizacion.logoUrl = logoUrl || logo || logo_url || imagen || null;
            }
            const servicioActualizado = await prisma.servicio.update({
                where: { id },
                data: datosActualizacion,
                include: {
                    administrador: {
                        select: {
                            id: true,
                            nombre: true,
                            email: true
                        }
                    },
                    _count: {
                        select: {
                            suscripciones: true,
                            carritoItems: true
                        }
                    }
                }
            });
            res.json({
                success: true,
                message: 'Servicio actualizado exitosamente',
                data: servicioActualizado
            });
        }
        catch (error) {
            console.error('Error al actualizar servicio:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    },
    eliminarServicio: async (req, res) => {
        try {
            const { id } = req.params;
            const adminId = req.user?.id;
            if (!adminId) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }
            const servicio = await prisma.servicio.findUnique({
                where: { id },
                include: {
                    _count: {
                        select: {
                            suscripciones: true,
                            carritoItems: true
                        }
                    }
                }
            });
            if (!servicio) {
                return res.status(404).json({
                    success: false,
                    message: 'Servicio no encontrado'
                });
            }
            if (servicio.administradorId !== adminId) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para eliminar este servicio'
                });
            }
            const suscripcionesActivas = await prisma.suscripcion.count({
                where: {
                    servicioId: id,
                    estado: 'ACTIVA'
                }
            });
            if (suscripcionesActivas > 0) {
                return res.status(409).json({
                    success: false,
                    message: `No se puede eliminar el servicio. Tiene ${suscripcionesActivas} suscripciones activas.`,
                    data: {
                        suscripcionesActivas,
                        enCarritos: servicio._count.carritoItems
                    }
                });
            }
            await prisma.servicio.delete({
                where: { id }
            });
            res.json({
                success: true,
                message: 'Servicio eliminado exitosamente'
            });
        }
        catch (error) {
            console.error('Error al eliminar servicio:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    },
    consultarClientes: async (req, res) => {
        try {
            const { activo, page = '1', limit = '20', search, orderBy = 'createdAt', order = 'desc' } = req.query;
            const take = Math.min(parseInt(limit), 100);
            const skip = (parseInt(page) - 1) * take;
            const where = {};
            if (activo !== undefined)
                where.activo = activo === 'true';
            if (search) {
                where.OR = [
                    { nombre: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } }
                ];
            }
            const [clientes, total] = await Promise.all([
                prisma.cliente.findMany({
                    where,
                    include: {
                        _count: {
                            select: {
                                suscripciones: true,
                                pagos: true,
                                carritos: true
                            }
                        },
                        suscripciones: {
                            where: { estado: 'ACTIVA' },
                            include: {
                                servicio: {
                                    select: {
                                        nombre: true,
                                        precio: true
                                    }
                                }
                            }
                        },
                        pagos: {
                            where: { estado: 'COMPLETADO' },
                            select: {
                                monto: true,
                                createdAt: true
                            },
                            orderBy: { createdAt: 'desc' },
                            take: 5
                        }
                    },
                    orderBy: {
                        [orderBy]: order
                    },
                    take,
                    skip
                }),
                prisma.cliente.count({ where })
            ]);
            const clientesConMetricas = clientes.map(cliente => {
                const gastoTotal = cliente.pagos.reduce((sum, pago) => sum + Number(pago.monto), 0);
                const gastoMensual = cliente.suscripciones.reduce((sum, sub) => sum + Number(sub.servicio.precio), 0);
                return {
                    ...cliente,
                    metricas: {
                        suscripcionesActivas: cliente._count.suscripciones,
                        totalPagos: cliente._count.pagos,
                        gastoTotal,
                        gastoMensual,
                        ultimoPago: cliente.pagos[0]?.createdAt || null
                    }
                };
            });
            res.json({
                success: true,
                data: {
                    clientes: clientesConMetricas,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / take),
                        totalItems: total,
                        itemsPerPage: take,
                        hasNextPage: skip + take < total,
                        hasPrevPage: parseInt(page) > 1
                    }
                }
            });
        }
        catch (error) {
            console.error('Error al consultar clientes:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    },
    suspenderCliente: async (req, res) => {
        try {
            const { id } = req.params;
            const { motivo, duracion } = req.body;
            const cliente = await prisma.cliente.findUnique({
                where: { id },
                include: {
                    _count: {
                        select: {
                            suscripciones: true
                        }
                    }
                }
            });
            if (!cliente) {
                return res.status(404).json({
                    success: false,
                    message: 'Cliente no encontrado'
                });
            }
            if (!cliente.activo) {
                return res.status(409).json({
                    success: false,
                    message: 'El cliente ya está suspendido'
                });
            }
            const [clienteActualizado, suscripcionesPausadas] = await Promise.all([
                prisma.cliente.update({
                    where: { id },
                    data: {
                        activo: false,
                        updatedAt: new Date()
                    }
                }),
                prisma.suscripcion.updateMany({
                    where: {
                        clienteId: id,
                        estado: 'ACTIVA'
                    },
                    data: {
                        estado: 'PAUSADA'
                    }
                })
            ]);
            res.json({
                success: true,
                message: 'Cliente suspendido exitosamente',
                data: {
                    cliente: clienteActualizado,
                    suscripcionesPausadas: suscripcionesPausadas.count,
                    motivo,
                    duracion
                }
            });
        }
        catch (error) {
            console.error('Error al suspender cliente:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    },
    consultarCarrito: async (req, res) => {
        try {
            const { idCliente } = req.params;
            const cliente = await prisma.cliente.findUnique({
                where: { id: idCliente },
                select: {
                    id: true,
                    nombre: true,
                    email: true,
                    activo: true
                }
            });
            if (!cliente) {
                return res.status(404).json({
                    success: false,
                    message: 'Cliente no encontrado'
                });
            }
            const carritos = await prisma.carrito.findMany({
                where: { clienteId: idCliente },
                include: {
                    items: {
                        include: {
                            servicio: {
                                select: {
                                    id: true,
                                    nombre: true,
                                    descripcion: true,
                                    precio: true,
                                    categoria: true,
                                    disponible: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
            const carritosConTotales = carritos.map(carrito => {
                const subtotal = carrito.items.reduce((sum, item) => sum + (Number(item.precio) * item.cantidad), 0);
                return {
                    ...carrito,
                    resumen: {
                        cantidadItems: carrito.items.length,
                        subtotal,
                        total: subtotal
                    }
                };
            });
            res.json({
                success: true,
                data: {
                    cliente,
                    carritos: carritosConTotales,
                    estadisticas: {
                        totalCarritos: carritos.length,
                        carritoActivo: carritos.find(c => c.activo) || null,
                        carritosHistoricos: carritos.filter(c => !c.activo).length
                    }
                }
            });
        }
        catch (error) {
            console.error('Error al consultar carrito del cliente:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
};
//# sourceMappingURL=adminController.js.map