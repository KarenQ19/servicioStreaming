"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.obtenerDetalleSuscripcion = exports.reactivarSuscripcion = exports.pausarSuscripcion = exports.cancelarSuscripcion = exports.crearSuscripcion = exports.crearSuscripcionDesdeCarrito = exports.obtenerSuscripciones = void 0;
const client_1 = require("@prisma/client");
const credencialesController_1 = require("./credencialesController");
const prisma = new client_1.PrismaClient();
const obtenerSuscripciones = async (req, res) => {
    try {
        const clienteId = req.user?.id;
        const { estado, page = '1', limit = '10' } = req.query;
        if (!clienteId) {
            res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
            return;
        }
        const take = Math.min(parseInt(limit), 50);
        const skip = (parseInt(page) - 1) * take;
        const where = {
            clienteId
        };
        if (estado && typeof estado === 'string') {
            where.estado = estado.toUpperCase();
        }
        const [suscripciones, total] = await Promise.all([
            prisma.suscripcion.findMany({
                where,
                include: {
                    servicio: {
                        select: {
                            id: true,
                            nombre: true,
                            descripcion: true,
                            precio: true,
                            categoria: true,
                            logoUrl: true,
                            disponible: true,
                            caracteristicas: true
                        }
                    },
                    credenciales: {
                        where: {
                            activas: true
                        },
                        select: {
                            id: true,
                            usuario: true,
                            password: true,
                            activas: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take,
                skip
            }),
            prisma.suscripcion.count({ where })
        ]);
        const totalPages = Math.ceil(total / take);
        res.json({
            success: true,
            data: {
                suscripciones,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: total,
                    itemsPerPage: take,
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1
                }
            }
        });
    }
    catch (error) {
        console.error('Error al obtener suscripciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
exports.obtenerSuscripciones = obtenerSuscripciones;
const crearSuscripcionDesdeCarrito = async (req, res) => {
    try {
        const clienteId = req.user?.id;
        const { metodoPagoId } = req.body;
        if (!clienteId) {
            res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
            return;
        }
        const carrito = await prisma.carrito.findFirst({
            where: {
                clienteId,
                activo: true
            },
            include: {
                items: {
                    include: {
                        servicio: true
                    }
                }
            }
        });
        if (!carrito || carrito.items.length === 0) {
            res.status(400).json({
                success: false,
                message: 'Carrito no encontrado o vacío'
            });
            return;
        }
        const itemsValidos = [];
        const duplicados = [];
        for (const item of carrito.items) {
            const suscripcionExistente = await prisma.suscripcion.findFirst({
                where: {
                    clienteId,
                    servicioId: item.servicioId,
                    estado: 'ACTIVA'
                }
            });
            if (suscripcionExistente) {
                duplicados.push(item.servicio.nombre);
                continue;
            }
            itemsValidos.push(item);
        }
        if (itemsValidos.length === 0) {
            res.status(200).json({
                success: true,
                message: duplicados.length
                    ? `Ya tienes suscripciones activas a ${duplicados.join(', ')}`
                    : 'No hay servicios para procesar',
                data: {
                    suscripciones: [],
                    credenciales: [],
                    pago: null,
                    carritoDesactivado: false
                }
            });
            return;
        }
        const itemsParaProcesar = itemsValidos;
        const total = itemsParaProcesar.reduce((sum, item) => {
            return sum + (parseFloat(item.precio.toString()) * item.cantidad);
        }, 0);
        if (total <= 0) {
            res.status(200).json({
                success: true,
                message: 'No hay cargos que procesar',
                data: {
                    suscripciones: [],
                    credenciales: [],
                    pago: null,
                    carritoDesactivado: false
                }
            });
            return;
        }
        const pago = await prisma.pago.create({
            data: {
                clienteId,
                carritoId: carrito.id,
                metodoPagoId,
                monto: total,
                estado: 'PENDIENTE',
                referencia: `PAY-${Date.now()}`,
                descripcion: `Pago de suscripciones desde carrito - ${carrito.items.length} servicio(s)`
            }
        });
        const pagoCompletado = await prisma.pago.update({
            where: { id: pago.id },
            data: { estado: 'COMPLETADO' }
        });
        const { pagoController } = await Promise.resolve().then(() => __importStar(require('./pagoController')));
        let resultado;
        try {
            resultado = await pagoController.procesarPagoCompletado(pagoCompletado.id);
        }
        catch (processingError) {
            console.error('Error en procesamiento automático:', processingError);
            await prisma.pago.update({
                where: { id: pago.id },
                data: { estado: 'PENDIENTE' }
            });
            throw new Error('Error al procesar el pago automáticamente');
        }
        res.json({
            success: true,
            message: 'Suscripciones creadas exitosamente',
            data: {
                suscripciones: resultado.suscripcionesCreadas,
                credenciales: resultado.credencialesAsignadas,
                pago: {
                    id: pago.id,
                    total: pago.monto,
                    referencia: pago.referencia
                },
                carritoDesactivado: resultado.carritoDesactivado
            }
        });
    }
    catch (error) {
        console.error('Error al crear suscripciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
exports.crearSuscripcionDesdeCarrito = crearSuscripcionDesdeCarrito;
const crearSuscripcion = async (req, res) => {
    try {
        const clienteId = req.user?.id;
        const { servicioId, metodoPagoId } = req.body;
        if (!clienteId) {
            res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
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
        if (!servicio.disponible) {
            res.status(400).json({
                success: false,
                message: 'El servicio no está disponible'
            });
            return;
        }
        const suscripcionExistente = await prisma.suscripcion.findFirst({
            where: {
                clienteId,
                servicioId,
                estado: 'ACTIVA'
            }
        });
        if (suscripcionExistente) {
            res.status(400).json({
                success: false,
                message: 'Ya tienes una suscripción activa a este servicio'
            });
            return;
        }
        const fechaInicio = new Date();
        const fechaFin = new Date();
        fechaFin.setMonth(fechaFin.getMonth() + 1);
        const pago = await prisma.pago.create({
            data: {
                clienteId,
                metodoPagoId,
                monto: servicio.precio,
                estado: 'COMPLETADO',
                referencia: `SUB-${Date.now()}`,
                descripcion: `Suscripción a ${servicio.nombre}`
            }
        });
        const suscripcion = await prisma.suscripcion.create({
            data: {
                clienteId,
                servicioId,
                estado: 'ACTIVA',
                fechaInicio,
                fechaFin
            },
            include: {
                servicio: {
                    select: {
                        id: true,
                        nombre: true,
                        descripcion: true,
                        precio: true,
                        categoria: true
                    }
                }
            }
        });
        let credenciales;
        try {
            credenciales = await (0, credencialesController_1.asignarCredencial)(servicioId, clienteId, suscripcion.id);
        }
        catch (credError) {
            console.warn('No hay credenciales disponibles en el pool, creando credenciales genéricas:', credError);
            credenciales = await prisma.credenciales.create({
                data: {
                    clienteId,
                    servicioId,
                    suscripcionId: suscripcion.id,
                    usuario: `user_${clienteId.slice(-6)}_${servicioId.slice(-4)}`,
                    password: `pass_${Math.random().toString(36).slice(-8)}`,
                    activas: true,
                    asignadas: true
                }
            });
        }
        await prisma.pago.update({
            where: { id: pago.id },
            data: { suscripcionId: suscripcion.id }
        });
        res.json({
            success: true,
            message: 'Suscripción creada exitosamente',
            data: {
                suscripcion: {
                    ...suscripcion,
                    credenciales
                },
                pago: {
                    id: pago.id,
                    total: pago.monto,
                    referencia: pago.referencia
                }
            }
        });
    }
    catch (error) {
        console.error('Error al crear suscripción:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
exports.crearSuscripcion = crearSuscripcion;
const cancelarSuscripcion = async (req, res) => {
    try {
        const clienteId = req.user?.id;
        const { suscripcionId } = req.params;
        if (!clienteId) {
            res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
            return;
        }
        const suscripcion = await prisma.suscripcion.findFirst({
            where: {
                id: suscripcionId,
                clienteId
            },
            include: {
                servicio: {
                    select: {
                        nombre: true
                    }
                }
            }
        });
        if (!suscripcion) {
            res.status(404).json({
                success: false,
                message: 'Suscripción no encontrada'
            });
            return;
        }
        if (suscripcion.estado === 'CANCELADA') {
            res.status(400).json({
                success: false,
                message: 'La suscripción ya está cancelada'
            });
            return;
        }
        const suscripcionActualizada = await prisma.suscripcion.update({
            where: { id: suscripcionId },
            data: {
                estado: 'CANCELADA',
                fechaFin: new Date()
            },
            include: {
                servicio: {
                    select: {
                        id: true,
                        nombre: true,
                        descripcion: true,
                        precio: true,
                        categoria: true
                    }
                }
            }
        });
        await prisma.credenciales.updateMany({
            where: {
                suscripcionId,
                activas: true
            },
            data: {
                activas: false
            }
        });
        res.json({
            success: true,
            message: 'Suscripción cancelada exitosamente',
            data: suscripcionActualizada
        });
    }
    catch (error) {
        console.error('Error al cancelar suscripción:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
exports.cancelarSuscripcion = cancelarSuscripcion;
const pausarSuscripcion = async (req, res) => {
    try {
        const clienteId = req.user?.id;
        const { suscripcionId } = req.params;
        if (!clienteId) {
            res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
            return;
        }
        const suscripcion = await prisma.suscripcion.findFirst({
            where: {
                id: suscripcionId,
                clienteId,
                estado: 'ACTIVA'
            }
        });
        if (!suscripcion) {
            res.status(404).json({
                success: false,
                message: 'Suscripción activa no encontrada'
            });
            return;
        }
        const suscripcionActualizada = await prisma.suscripcion.update({
            where: { id: suscripcionId },
            data: { estado: 'PAUSADA' },
            include: {
                servicio: {
                    select: {
                        id: true,
                        nombre: true,
                        descripcion: true,
                        precio: true,
                        categoria: true
                    }
                }
            }
        });
        res.json({
            success: true,
            message: 'Suscripción pausada exitosamente',
            data: suscripcionActualizada
        });
    }
    catch (error) {
        console.error('Error al pausar suscripción:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
exports.pausarSuscripcion = pausarSuscripcion;
const reactivarSuscripcion = async (req, res) => {
    try {
        const clienteId = req.user?.id;
        const { suscripcionId } = req.params;
        if (!clienteId) {
            res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
            return;
        }
        const suscripcion = await prisma.suscripcion.findFirst({
            where: {
                id: suscripcionId,
                clienteId,
                estado: 'PAUSADA'
            }
        });
        if (!suscripcion) {
            res.status(404).json({
                success: false,
                message: 'Suscripción pausada no encontrada'
            });
            return;
        }
        const suscripcionActualizada = await prisma.suscripcion.update({
            where: { id: suscripcionId },
            data: { estado: 'ACTIVA' },
            include: {
                servicio: {
                    select: {
                        id: true,
                        nombre: true,
                        descripcion: true,
                        precio: true,
                        categoria: true
                    }
                }
            }
        });
        res.json({
            success: true,
            message: 'Suscripción reactivada exitosamente',
            data: suscripcionActualizada
        });
    }
    catch (error) {
        console.error('Error al reactivar suscripción:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
exports.reactivarSuscripcion = reactivarSuscripcion;
const obtenerDetalleSuscripcion = async (req, res) => {
    try {
        const clienteId = req.user?.id;
        const { suscripcionId } = req.params;
        if (!clienteId) {
            res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
            return;
        }
        const suscripcion = await prisma.suscripcion.findFirst({
            where: {
                id: suscripcionId,
                clienteId
            },
            include: {
                servicio: {
                    select: {
                        id: true,
                        nombre: true,
                        descripcion: true,
                        precio: true,
                        categoria: true,
                        disponible: true,
                        caracteristicas: true
                    }
                },
                credenciales: {
                    where: {
                        activas: true
                    },
                    select: {
                        id: true,
                        usuario: true,
                        password: true,
                        activas: true,
                        createdAt: true
                    }
                },
                pagos: {
                    select: {
                        id: true,
                        monto: true,
                        estado: true,
                        referencia: true,
                        createdAt: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });
        if (!suscripcion) {
            res.status(404).json({
                success: false,
                message: 'Suscripción no encontrada'
            });
            return;
        }
        const ahora = new Date();
        const diasRestantes = Math.max(0, Math.ceil((suscripcion.fechaFin.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)));
        res.json({
            success: true,
            data: {
                ...suscripcion,
                diasRestantes,
                proximoVencimiento: suscripcion.fechaFin,
                estaVencida: ahora > suscripcion.fechaFin
            }
        });
    }
    catch (error) {
        console.error('Error al obtener detalle de suscripción:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};
exports.obtenerDetalleSuscripcion = obtenerDetalleSuscripcion;
//# sourceMappingURL=suscripcionController.js.map