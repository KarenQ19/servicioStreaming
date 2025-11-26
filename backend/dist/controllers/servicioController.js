"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.obtenerCategorias = exports.filtrarServicios = exports.buscarServicios = exports.verificarDisponibilidad = exports.actualizarInfo = exports.mostrarDetalles = exports.listarServicios = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const listarServicios = async (req, res) => {
    try {
        const { categoria, disponible, limit = '10', offset = '0' } = req.query;
        const where = {};
        if (categoria) {
            where.categoria = categoria;
        }
        if (disponible !== undefined) {
            where.disponible = disponible === 'true';
        }
        const servicios = await prisma.servicio.findMany({
            where,
            include: {
                administrador: {
                    select: {
                        id: true,
                        nombre: true
                    }
                },
                _count: {
                    select: {
                        suscripciones: true,
                        carritoItems: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: parseInt(limit),
            skip: parseInt(offset)
        });
        const total = await prisma.servicio.count({ where });
        res.json({
            success: true,
            data: {
                servicios,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: total > parseInt(offset) + parseInt(limit)
                }
            }
        });
    }
    catch (error) {
        console.error('Error al listar servicios:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
exports.listarServicios = listarServicios;
const mostrarDetalles = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({
                success: false,
                message: 'ID del servicio es requerido'
            });
            return;
        }
        const servicio = await prisma.servicio.findUnique({
            where: { id },
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
                    where: {
                        estado: 'ACTIVA'
                    },
                    select: {
                        id: true,
                        estado: true,
                        fechaInicio: true,
                        fechaFin: true,
                        cliente: {
                            select: {
                                id: true,
                                nombre: true
                            }
                        }
                    },
                    take: 5,
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });
        if (!servicio) {
            res.status(404).json({
                success: false,
                message: 'Servicio no encontrado'
            });
            return;
        }
        const estadisticas = {
            totalSuscripciones: servicio._count.suscripciones,
            enCarritos: servicio._count.carritoItems,
            suscripcionesActivas: servicio.suscripciones.length
        };
        res.json({
            success: true,
            data: {
                servicio: {
                    ...servicio,
                    estadisticas
                }
            }
        });
    }
    catch (error) {
        console.error('Error al obtener detalles del servicio:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
exports.mostrarDetalles = mostrarDetalles;
const actualizarInfo = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, precio, categoria, disponible, caracteristicas, logoUrl, logo, logo_url, imagen } = req.body;
        if (!id) {
            res.status(400).json({
                success: false,
                message: 'ID del servicio es requerido'
            });
            return;
        }
        const servicioExistente = await prisma.servicio.findUnique({
            where: { id },
            include: {
                administrador: true
            }
        });
        if (!servicioExistente) {
            res.status(404).json({
                success: false,
                message: 'Servicio no encontrado'
            });
            return;
        }
        const userId = req.user?.id;
        const userRole = req.user?.role;
        if (userRole !== 'ADMINISTRADOR') {
            res.status(403).json({
                success: false,
                message: 'Solo los administradores pueden actualizar servicios'
            });
            return;
        }
        if (servicioExistente.administradorId !== userId) {
            res.status(403).json({
                success: false,
                message: 'Solo puedes actualizar tus propios servicios'
            });
            return;
        }
        const datosActualizacion = {};
        if (nombre !== undefined)
            datosActualizacion.nombre = nombre;
        if (descripcion !== undefined)
            datosActualizacion.descripcion = descripcion;
        if (precio !== undefined)
            datosActualizacion.precio = Number(precio);
        if (categoria !== undefined)
            datosActualizacion.categoria = categoria;
        if (disponible !== undefined)
            datosActualizacion.disponible = Boolean(disponible);
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
                        suscripciones: true
                    }
                }
            }
        });
        res.json({
            success: true,
            message: 'Servicio actualizado exitosamente',
            data: {
                servicio: servicioActualizado
            }
        });
    }
    catch (error) {
        console.error('Error al actualizar servicio:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
exports.actualizarInfo = actualizarInfo;
const verificarDisponibilidad = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({
                success: false,
                message: 'ID del servicio es requerido'
            });
            return;
        }
        const servicio = await prisma.servicio.findUnique({
            where: { id },
            select: {
                id: true,
                nombre: true,
                disponible: true,
                precio: true,
                categoria: true,
                _count: {
                    select: {
                        suscripciones: {
                            where: {
                                estado: 'ACTIVA'
                            }
                        },
                        carritoItems: true
                    }
                }
            }
        });
        if (!servicio) {
            res.status(404).json({
                success: false,
                message: 'Servicio no encontrado'
            });
            return;
        }
        const disponibilidad = {
            disponible: servicio.disponible,
            suscripcionesActivas: servicio._count.suscripciones,
            enCarritos: servicio._count.carritoItems,
            estado: servicio.disponible ? 'DISPONIBLE' : 'NO_DISPONIBLE',
            mensaje: servicio.disponible
                ? 'El servicio está disponible para suscripción'
                : 'El servicio no está disponible actualmente'
        };
        const limiteCapacidad = 1000;
        if (servicio.disponible && servicio._count.suscripciones >= limiteCapacidad) {
            disponibilidad.disponible = false;
            disponibilidad.estado = 'CAPACIDAD_COMPLETA';
            disponibilidad.mensaje = 'El servicio ha alcanzado su capacidad máxima';
        }
        res.json({
            success: true,
            data: {
                servicio: {
                    id: servicio.id,
                    nombre: servicio.nombre,
                    precio: servicio.precio,
                    categoria: servicio.categoria
                },
                disponibilidad
            }
        });
    }
    catch (error) {
        console.error('Error al verificar disponibilidad:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
exports.verificarDisponibilidad = verificarDisponibilidad;
const buscarServicios = async (req, res) => {
    try {
        const { q, categoria, disponible, limit = '10', offset = '0' } = req.query;
        if (!q || typeof q !== 'string') {
            res.status(400).json({
                success: false,
                message: 'Parámetro de búsqueda "q" es requerido'
            });
            return;
        }
        const where = {
            OR: [
                {
                    nombre: {
                        contains: q,
                        mode: 'insensitive'
                    }
                },
                {
                    descripcion: {
                        contains: q,
                        mode: 'insensitive'
                    }
                },
                {
                    categoria: {
                        contains: q,
                        mode: 'insensitive'
                    }
                }
            ]
        };
        if (categoria) {
            where.categoria = categoria;
        }
        if (disponible !== undefined) {
            where.disponible = disponible === 'true';
        }
        const servicios = await prisma.servicio.findMany({
            where,
            include: {
                administrador: {
                    select: {
                        id: true,
                        nombre: true
                    }
                },
                _count: {
                    select: {
                        suscripciones: true,
                        carritoItems: true
                    }
                }
            },
            orderBy: [
                { disponible: 'desc' },
                { createdAt: 'desc' }
            ],
            take: parseInt(limit),
            skip: parseInt(offset)
        });
        const total = await prisma.servicio.count({ where });
        res.json({
            success: true,
            data: {
                servicios,
                searchTerm: q,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: total > parseInt(offset) + parseInt(limit)
                }
            }
        });
    }
    catch (error) {
        console.error('Error al buscar servicios:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
exports.buscarServicios = buscarServicios;
const filtrarServicios = async (req, res) => {
    try {
        const { categoria, disponible, precioMin, precioMax, ordenarPor = 'createdAt', orden = 'desc', limit = '10', offset = '0' } = req.query;
        const where = {};
        if (categoria) {
            where.categoria = categoria;
        }
        if (disponible !== undefined) {
            where.disponible = disponible === 'true';
        }
        if (precioMin || precioMax) {
            where.precio = {};
            if (precioMin) {
                where.precio.gte = parseFloat(precioMin);
            }
            if (precioMax) {
                where.precio.lte = parseFloat(precioMax);
            }
        }
        const validOrderBy = ['createdAt', 'precio', 'nombre'];
        const validOrder = ['asc', 'desc'];
        const orderBy = {};
        if (validOrderBy.includes(ordenarPor) && validOrder.includes(orden)) {
            orderBy[ordenarPor] = orden;
        }
        else {
            orderBy.createdAt = 'desc';
        }
        const servicios = await prisma.servicio.findMany({
            where,
            include: {
                administrador: {
                    select: {
                        id: true,
                        nombre: true
                    }
                },
                _count: {
                    select: {
                        suscripciones: true,
                        carritoItems: true
                    }
                }
            },
            orderBy,
            take: parseInt(limit),
            skip: parseInt(offset)
        });
        const total = await prisma.servicio.count({ where });
        const stats = await prisma.servicio.aggregate({
            where,
            _avg: { precio: true },
            _min: { precio: true },
            _max: { precio: true }
        });
        res.json({
            success: true,
            data: {
                servicios,
                filters: {
                    categoria,
                    disponible,
                    precioMin,
                    precioMax,
                    ordenarPor,
                    orden
                },
                stats: {
                    precioPromedio: stats._avg.precio,
                    precioMinimo: stats._min.precio,
                    precioMaximo: stats._max.precio
                },
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: total > parseInt(offset) + parseInt(limit)
                }
            }
        });
    }
    catch (error) {
        console.error('Error al filtrar servicios:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
exports.filtrarServicios = filtrarServicios;
const obtenerCategorias = async (req, res) => {
    try {
        const categorias = await prisma.servicio.findMany({
            select: {
                categoria: true
            },
            distinct: ['categoria'],
            where: {
                disponible: true
            },
            orderBy: {
                categoria: 'asc'
            }
        });
        const categoriasConConteo = await Promise.all(categorias.map(async (cat) => {
            const count = await prisma.servicio.count({
                where: {
                    categoria: cat.categoria,
                    disponible: true
                }
            });
            return {
                nombre: cat.categoria,
                count
            };
        }));
        res.json({
            success: true,
            data: {
                categorias: categoriasConConteo,
                total: categorias.length
            }
        });
    }
    catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
exports.obtenerCategorias = obtenerCategorias;
//# sourceMappingURL=servicioController.js.map