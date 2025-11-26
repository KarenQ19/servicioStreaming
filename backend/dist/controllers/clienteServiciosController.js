"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filtrarServicios = exports.consultarServicios = exports.buscarServiciosCliente = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const selectServicioBase = {
    id: true,
    nombre: true,
    descripcion: true,
    precio: true,
    categoria: true,
    disponible: true,
    logoUrl: true,
    caracteristicas: true,
    createdAt: true,
    _count: {
        select: {
            suscripciones: {
                where: {
                    estado: 'ACTIVA'
                }
            }
        }
    }
};
const buscarServiciosCliente = async (req, res) => {
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
        const selectServicioBase = {
            id: true,
            nombre: true,
            descripcion: true,
            precio: true,
            categoria: true,
            disponible: true,
            logoUrl: true,
            caracteristicas: true,
            createdAt: true,
            _count: {
                select: {
                    suscripciones: {
                        where: {
                            estado: 'ACTIVA'
                        }
                    }
                }
            }
        };
        const [servicios, total] = await Promise.all([
            prisma.servicio.findMany({
                where,
                skip,
                take,
                select: selectServicioBase,
                orderBy: [
                    { nombre: 'asc' },
                    { precio: 'asc' }
                ]
            }),
            prisma.servicio.count({ where })
        ]);
        const totalPages = Math.ceil(total / take);
        const serviciosConInfo = servicios.map((servicio) => ({
            ...servicio,
            popularidad: servicio._count.suscripciones,
            esPopular: servicio._count.suscripciones > 10
        }));
        res.json({
            success: true,
            data: {
                servicios: serviciosConInfo,
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
        console.error('Error al buscar servicios para cliente:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
exports.buscarServiciosCliente = buscarServiciosCliente;
const consultarServicios = async (req, res) => {
    try {
        const { page = 1, limit = 10, categoria, ordenarPor = 'popularidad' } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);
        const where = {
            disponible: true
        };
        if (categoria) {
            where.categoria = categoria;
        }
        let orderBy = {};
        switch (ordenarPor) {
            case 'precio_asc':
                orderBy = { precio: 'asc' };
                break;
            case 'precio_desc':
                orderBy = { precio: 'desc' };
                break;
            case 'nombre':
                orderBy = { nombre: 'asc' };
                break;
            case 'reciente':
                orderBy = { createdAt: 'desc' };
                break;
            case 'popularidad':
            default:
                orderBy = { createdAt: 'desc' };
                break;
        }
        const [servicios, total] = await Promise.all([
            prisma.servicio.findMany({
                where,
                skip,
                take,
                select: selectServicioBase,
                orderBy
            }),
            prisma.servicio.count({ where })
        ]);
        let serviciosOrdenados = servicios;
        if (ordenarPor === 'popularidad') {
            serviciosOrdenados = servicios.sort((a, b) => b._count.suscripciones - a._count.suscripciones);
        }
        const totalPages = Math.ceil(total / take);
        const serviciosConInfo = serviciosOrdenados.map((servicio) => ({
            ...servicio,
            popularidad: servicio._count.suscripciones,
            esPopular: servicio._count.suscripciones > 10,
            esNuevo: new Date(servicio.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }));
        res.json({
            success: true,
            data: {
                servicios: serviciosConInfo,
                pagination: {
                    currentPage: Number(page),
                    totalPages,
                    totalItems: total,
                    itemsPerPage: take,
                    hasNextPage: Number(page) < totalPages,
                    hasPrevPage: Number(page) > 1
                },
                filtros: {
                    categoria,
                    ordenarPor
                }
            }
        });
    }
    catch (error) {
        console.error('Error al consultar servicios para cliente:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
exports.consultarServicios = consultarServicios;
const filtrarServicios = async (req, res) => {
    try {
        const { categoria, precioMin, precioMax, esPopular, esNuevo, ordenarPor = 'popularidad', page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);
        const where = {
            disponible: true
        };
        if (categoria) {
            where.categoria = categoria;
        }
        if (precioMin || precioMax) {
            where.precio = {};
            if (precioMin)
                where.precio.gte = Number(precioMin);
            if (precioMax)
                where.precio.lte = Number(precioMax);
        }
        if (esNuevo === 'true') {
            const fechaLimite = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            where.createdAt = { gte: fechaLimite };
        }
        let orderBy = {};
        switch (ordenarPor) {
            case 'precio_asc':
                orderBy = { precio: 'asc' };
                break;
            case 'precio_desc':
                orderBy = { precio: 'desc' };
                break;
            case 'nombre':
                orderBy = { nombre: 'asc' };
                break;
            case 'reciente':
                orderBy = { createdAt: 'desc' };
                break;
            case 'popularidad':
            default:
                orderBy = { createdAt: 'desc' };
                break;
        }
        const [servicios, total] = await Promise.all([
            prisma.servicio.findMany({
                where,
                skip,
                take,
                select: selectServicioBase,
                orderBy
            }),
            prisma.servicio.count({ where })
        ]);
        let serviciosFiltrados = servicios;
        if (esPopular === 'true') {
            serviciosFiltrados = serviciosFiltrados.filter((servicio) => servicio._count.suscripciones > 10);
        }
        if (ordenarPor === 'popularidad') {
            serviciosFiltrados = serviciosFiltrados.sort((a, b) => b._count.suscripciones - a._count.suscripciones);
        }
        const totalFiltrados = serviciosFiltrados.length;
        const totalPages = Math.ceil(totalFiltrados / take);
        const serviciosConInfo = serviciosFiltrados.map((servicio) => ({
            ...servicio,
            popularidad: servicio._count.suscripciones,
            esPopular: servicio._count.suscripciones > 10,
            esNuevo: new Date(servicio.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }));
        res.json({
            success: true,
            data: {
                servicios: serviciosConInfo,
                filtrosAplicados: {
                    categoria,
                    precioMin: precioMin ? Number(precioMin) : null,
                    precioMax: precioMax ? Number(precioMax) : null,
                    esPopular: esPopular === 'true',
                    esNuevo: esNuevo === 'true',
                    ordenarPor
                },
                pagination: {
                    currentPage: Number(page),
                    totalPages,
                    totalItems: totalFiltrados,
                    itemsPerPage: take,
                    hasNextPage: Number(page) < totalPages,
                    hasPrevPage: Number(page) > 1
                }
            }
        });
    }
    catch (error) {
        console.error('Error al filtrar servicios para cliente:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
exports.filtrarServicios = filtrarServicios;
//# sourceMappingURL=clienteServiciosController.js.map