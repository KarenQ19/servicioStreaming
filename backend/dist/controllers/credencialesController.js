"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eliminarCredencialDelPool = exports.liberarCredencial = exports.asignarCredencial = exports.obtenerCredencialesAsignadas = exports.obtenerCredencialesDisponibles = exports.agregarCredencialesAlPool = exports.obtenerMisCredenciales = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const obtenerMisCredenciales = async (req, res) => {
    try {
        const clienteId = req.user?.id;
        if (!clienteId) {
            res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
            return;
        }
        const credenciales = await prisma.credenciales.findMany({
            where: {
                clienteId,
                activas: true,
                asignadas: true
            },
            include: {
                servicio: {
                    select: {
                        id: true,
                        nombre: true,
                        descripcion: true,
                        categoria: true
                    }
                },
                suscripcion: {
                    select: {
                        id: true,
                        estado: true,
                        fechaInicio: true,
                        fechaFin: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json({
            success: true,
            data: credenciales
        });
    }
    catch (error) {
        console.error('Error al obtener credenciales del cliente:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
exports.obtenerMisCredenciales = obtenerMisCredenciales;
const agregarCredencialesAlPool = async (req, res) => {
    try {
        const { servicioId } = req.params;
        const { credenciales } = req.body;
        if (!credenciales || !Array.isArray(credenciales)) {
            res.status(400).json({
                success: false,
                message: 'Se requiere un array de credenciales'
            });
            return;
        }
        const servicio = await prisma.servicio.findUnique({
            where: { id: servicioId }
        });
        if (!servicio) {
            res.status(404).json({
                success: false,
                message: 'Servicio no encontrado'
            });
            return;
        }
        const credencialesCreadas = [];
        for (const cred of credenciales) {
            const { usuario, password, urlAcceso, notas } = cred;
            if (!usuario || !password) {
                continue;
            }
            const existente = await prisma.credenciales.findFirst({
                where: {
                    servicioId,
                    usuario,
                    asignadas: false
                }
            });
            if (!existente) {
                const nuevaCredencial = await prisma.credenciales.create({
                    data: {
                        servicioId,
                        usuario,
                        password,
                        urlAcceso: urlAcceso || null,
                        notas: notas || null,
                        activas: true,
                        asignadas: false
                    }
                });
                credencialesCreadas.push(nuevaCredencial);
            }
        }
        res.json({
            success: true,
            message: `${credencialesCreadas.length} credenciales agregadas al pool`,
            data: credencialesCreadas
        });
    }
    catch (error) {
        console.error('Error al agregar credenciales al pool:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
exports.agregarCredencialesAlPool = agregarCredencialesAlPool;
const obtenerCredencialesDisponibles = async (req, res) => {
    try {
        const { servicioId } = req.params;
        const credenciales = await prisma.credenciales.findMany({
            where: {
                servicioId,
                asignadas: false,
                activas: true
            },
            select: {
                id: true,
                usuario: true,
                urlAcceso: true,
                notas: true,
                createdAt: true
            }
        });
        res.json({
            success: true,
            data: credenciales
        });
    }
    catch (error) {
        console.error('Error al obtener credenciales disponibles:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
exports.obtenerCredencialesDisponibles = obtenerCredencialesDisponibles;
const obtenerCredencialesAsignadas = async (req, res) => {
    try {
        const { servicioId } = req.params;
        const credenciales = await prisma.credenciales.findMany({
            where: {
                servicioId,
                asignadas: true
            },
            include: {
                cliente: {
                    select: {
                        id: true,
                        nombre: true,
                        email: true
                    }
                },
                suscripcion: {
                    select: {
                        id: true,
                        estado: true,
                        fechaInicio: true,
                        fechaFin: true
                    }
                }
            }
        });
        res.json({
            success: true,
            data: credenciales
        });
    }
    catch (error) {
        console.error('Error al obtener credenciales asignadas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
exports.obtenerCredencialesAsignadas = obtenerCredencialesAsignadas;
const asignarCredencial = async (servicioId, clienteId, suscripcionId) => {
    try {
        const credencialDisponible = await prisma.credenciales.findFirst({
            where: {
                servicioId,
                asignadas: false,
                activas: true
            }
        });
        if (credencialDisponible) {
            const credencialAsignada = await prisma.credenciales.update({
                where: { id: credencialDisponible.id },
                data: {
                    clienteId,
                    suscripcionId,
                    asignadas: true
                }
            });
            return credencialAsignada;
        }
        else {
            console.warn(`No hay credenciales disponibles para el servicio ${servicioId}, creando una genérica.`);
            const credencialGenerica = await prisma.credenciales.create({
                data: {
                    clienteId,
                    servicioId,
                    suscripcionId,
                    usuario: `user_${clienteId.slice(-6)}_${servicioId.slice(-4)}`,
                    password: `pass_${Math.random().toString(36).slice(-8)}`,
                    activas: true,
                    asignadas: true
                }
            });
            return credencialGenerica;
        }
    }
    catch (error) {
        console.error('Error al asignar o crear credencial:', error);
        throw error;
    }
};
exports.asignarCredencial = asignarCredencial;
const liberarCredencial = async (suscripcionId) => {
    try {
        await prisma.credenciales.updateMany({
            where: {
                suscripcionId,
                asignadas: true
            },
            data: {
                clienteId: null,
                suscripcionId: null,
                asignadas: false
            }
        });
    }
    catch (error) {
        console.error('Error al liberar credencial:', error);
        throw error;
    }
};
exports.liberarCredencial = liberarCredencial;
const eliminarCredencialDelPool = async (req, res) => {
    try {
        const { credencialId } = req.params;
        const credencial = await prisma.credenciales.findUnique({
            where: { id: credencialId }
        });
        if (!credencial) {
            res.status(404).json({
                success: false,
                message: 'Credencial no encontrada'
            });
            return;
        }
        if (credencial.asignadas) {
            res.status(400).json({
                success: false,
                message: 'No se puede eliminar una credencial asignada'
            });
            return;
        }
        await prisma.credenciales.delete({
            where: { id: credencialId }
        });
        res.json({
            success: true,
            message: 'Credencial eliminada del pool'
        });
    }
    catch (error) {
        console.error('Error al eliminar credencial:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
exports.eliminarCredencialDelPool = eliminarCredencialDelPool;
//# sourceMappingURL=credencialesController.js.map