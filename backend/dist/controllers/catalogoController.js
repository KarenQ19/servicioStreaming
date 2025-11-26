"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.obtenerCategorias = exports.filtrarServicios = exports.buscarServicio = exports.consultarCatalogo = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const consultarCatalogo = async (req, res) => {
    try {
        const { page = 1, limit = 10, categoria, disponible } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);
        const where = {};
        if (categoria) {
            where.categoria = categoria;
        }
        if (disponible !== undefined) {
            where.disponible = disponible === 'true';
        }
        const [servicios, total] = await Promise.all([
            prisma.servicio.findMany({
                where,
                skip,
                take,
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
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            prisma.servicio.count({ where })
        ]);
        const totalPages = Math.ceil(total / take);
        res.json({
            success: true,
            data: {
                servicios,
                pagination: {
                    currentPage: Number(page),
                    totalPages,
                    totalItems: total,
                    itemsPerPage: take,
                    hasNextPage: Number(page) < totalPages,
                    hasPrevPage: Number(page) > 1
                }
            }
        });
    }
    catch (error) {
        console.error('Error al consultar catálogo:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
exports.consultarCatalogo = consultarCatalogo;
const buscarServicio = async (req, res) => {
    try {
        const { q, categoria, precioMin, precioMax, page = 1, limit = 10 } = req.query;
        if (!q || typeof q !== 'string') {
            res.status(400).json({
                success: false,
                message: 'El parámetro de búsqueda "q" es requerido'
            });
            return;
        }
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);
        const where = {
            AND: [
                {
                    OR: [
                        { nombre: { contains: q, mode: 'insensitive' } },
                        { descripcion: { contains: q, mode: 'insensitive' } },
                        { categoria: { contains: q, mode: 'insensitive' } }
                    ]
                },
                { disponible: true }
            ]
        };
        if (categoria) {
            where.AND.push({ categoria: categoria });
        }
        if (precioMin) {
            where.AND.push({ precio: { gte: Number(precioMin) } });
        }
        if (precioMax) {
            where.AND.push({ precio: { lte: Number(precioMax) } });
        }
        const [servicios, total] = await Promise.all([
            prisma.servicio.findMany({
                where,
                skip,
                take,
                include: {
                    administrador: {
                        select: {
                            id: true,
                            nombre: true
                        }
                    },
                    _count: {
                        select: {
                            suscripciones: true
                        }
                    }
                },
                orderBy: [
                    { nombre: 'asc' },
                    { precio: 'asc' }
                ]
            }),
            prisma.servicio.count({ where })
        ]);
        const totalPages = Math.ceil(total / take);
        res.json({
            success: true,
            data: {
                servicios,
                searchTerm: q,
                pagination: {
                    currentPage: Number(page),
                    totalPages,
                    totalItems: total,
                    itemsPerPage: take,
                    hasNextPage: Number(page) < totalPages,
                    hasPrevPage: Number(page) > 1
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
exports.buscarServicio = buscarServicio;
const filtrarServicios = async (req, res) => {
    try {
        const { categoria, precioMin, precioMax, disponible, ordenarPor = 'nombre', orden = 'asc', page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);
        const where = {};
        if (categoria) {
            where.categoria = categoria;
        }
        if (disponible !== undefined) {
            where.disponible = disponible === 'true';
        }
        if (precioMin || precioMax) {
            where.precio = {};
            if (precioMin)
                where.precio.gte = Number(precioMin);
            if (precioMax)
                where.precio.lte = Number(precioMax);
        }
        const orderBy = {};
        const validOrderFields = ['nombre', 'precio', 'categoria', 'createdAt'];
        const orderField = validOrderFields.includes(ordenarPor) ? ordenarPor : 'nombre';
        const orderDirection = orden === 'desc' ? 'desc' : 'asc';
        orderBy[orderField] = orderDirection;
        const [servicios, total] = await Promise.all([
            prisma.servicio.findMany({
                where,
                skip,
                take,
                include: {
                    administrador: {
                        select: {
                            id: true,
                            nombre: true
                        }
                    },
                    _count: {
                        select: {
                            suscripciones: true
                        }
                    }
                },
                orderBy
            }),
            prisma.servicio.count({ where })
        ]);
        const totalPages = Math.ceil(total / take);
        res.json({
            success: true,
            data: {
                servicios,
                filters: {
                    categoria,
                    precioMin: precioMin ? Number(precioMin) : null,
                    precioMax: precioMax ? Number(precioMax) : null,
                    disponible: disponible ? disponible === 'true' : null,
                    ordenarPor: orderField,
                    orden: orderDirection
                },
                pagination: {
                    currentPage: Number(page),
                    totalPages,
                    totalItems: total,
                    itemsPerPage: take,
                    hasNextPage: Number(page) < totalPages,
                    hasPrevPage: Number(page) > 1
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
        const categorias = await prisma.servicio.groupBy({
            by: ['categoria'],
            where: {
                disponible: true
            },
            _count: {
                categoria: true
            },
            orderBy: {
                categoria: 'asc'
            }
        });
        const categoriasFormateadas = categorias.map((cat) => ({
            nombre: cat.categoria,
            totalServicios: cat._count.categoria
        }));
        const [totalServicios, totalCategorias] = await Promise.all([
            prisma.servicio.count({ where: { disponible: true } }),
            prisma.servicio.findMany({
                select: { categoria: true },
                distinct: ['categoria'],
                where: { disponible: true }
            })
        ]);
        res.json({
            success: true,
            data: {
                categorias: categoriasFormateadas,
                estadisticas: {
                    totalServicios,
                    totalCategorias: totalCategorias.length
                }
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
//# sourceMappingURL=catalogoController.js.map