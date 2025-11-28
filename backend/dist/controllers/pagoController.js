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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pagoController = void 0;
const client_1 = require("@prisma/client");
const qrcode_1 = __importDefault(require("qrcode"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const credencialesController_1 = require("./credencialesController");
const prisma = new client_1.PrismaClient();
exports.pagoController = {
    procesar: async (req, res) => {
        try {
            const { monto, metodoPagoId, carritoId, suscripcionId, descripcion } = req.body;
            const clienteId = req.user?.id;
            if (!clienteId) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }
            const metodoPago = await prisma.metodoPago.findUnique({
                where: { id: metodoPagoId }
            });
            if (!metodoPago) {
                return res.status(404).json({
                    success: false,
                    message: 'Método de pago no encontrado'
                });
            }
            const pago = await prisma.pago.create({
                data: {
                    monto,
                    metodoPagoId,
                    clienteId,
                    carritoId,
                    suscripcionId,
                    descripcion,
                    estado: 'PENDIENTE'
                },
                include: {
                    metodoPago: true,
                    cliente: {
                        select: {
                            id: true,
                            nombre: true,
                            email: true
                        }
                    }
                }
            });
            const procesado = Math.random() > 0.1;
            const estadoFinal = ['QR', 'TRANSFERENCIA'].includes(metodoPago.tipo)
                ? 'PENDIENTE'
                : (procesado ? 'COMPLETADO' : 'FALLIDO');
            const pagoActualizado = await prisma.pago.update({
                where: { id: pago.id },
                data: {
                    estado: estadoFinal
                },
                include: {
                    metodoPago: true,
                    cliente: {
                        select: {
                            id: true,
                            nombre: true,
                            email: true
                        }
                    }
                }
            });
            const obtenerImagenQR = async (codigoQR) => {
                try {
                    const { loadPaymentSettings } = await Promise.resolve().then(() => __importStar(require('./paymentConfigController')));
                    const settings = await loadPaymentSettings();
                    const adminQrPath = settings.qrImagePath || process.env.ADMIN_QR_IMAGE_PATH || process.env.QR_IMAGE_PATH;
                    const fallbackPath = path_1.default.join(__dirname, '../../uploads/qr/default.png');
                    const qrPath = (adminQrPath && fs_1.default.existsSync(adminQrPath)) ? adminQrPath
                        : (fs_1.default.existsSync(fallbackPath) ? fallbackPath : null);
                    if (qrPath) {
                        const buffer = await fs_1.default.promises.readFile(qrPath);
                        return buffer.toString('base64');
                    }
                }
                catch (err) {
                    console.error('Error cargando imagen QR configurada:', err);
                }
                const generado = await qrcode_1.default.toDataURL(codigoQR);
                return generado.split(',')[1];
            };
            let qrGenerado = null;
            if (metodoPago.tipo === 'QR') {
                try {
                    const codigo = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    const expiresAt = new Date();
                    expiresAt.setMinutes(expiresAt.getMinutes() + 3);
                    const qr = await prisma.qR.create({
                        data: {
                            codigo,
                            pagoId: pagoActualizado.id,
                            estado: 'ACTIVO',
                            expiresAt
                        }
                    });
                    const imagenBase64 = await obtenerImagenQR(codigo);
                    qrGenerado = {
                        ...qr,
                        imagenBase64
                    };
                }
                catch (qrError) {
                    console.error('Error al generar QR:', qrError);
                }
            }
            const respuesta = {
                pago: pagoActualizado,
                ...(qrGenerado && { qr: qrGenerado })
            };
            return res.status(201).json({
                success: true,
                data: respuesta,
                message: metodoPago.tipo === 'QR' ? 'Pago creado, escanea el QR para completar' :
                    (procesado ? 'Pago procesado exitosamente' : 'Error al procesar el pago')
            });
        }
        catch (error) {
            console.error('Error al procesar pago:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    },
    validar: async (req, res) => {
        try {
            const { id } = req.params;
            const clienteId = req.user?.id;
            if (!clienteId) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }
            const pago = await prisma.pago.findFirst({
                where: {
                    id,
                    clienteId
                },
                include: {
                    metodoPago: true,
                    cliente: {
                        select: {
                            id: true,
                            nombre: true,
                            email: true
                        }
                    }
                }
            });
            if (!pago) {
                return res.status(404).json({
                    success: false,
                    message: 'Pago no encontrado'
                });
            }
            const esValido = pago.estado === 'COMPLETADO';
            return res.json({
                success: true,
                data: {
                    pago,
                    esValido,
                    mensaje: esValido ? 'Pago válido' : 'Pago no válido o no completado'
                }
            });
        }
        catch (error) {
            console.error('Error al validar pago:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    },
    reembolsar: async (req, res) => {
        try {
            const { id } = req.params;
            const { motivo } = req.body;
            const clienteId = req.user?.id;
            if (!clienteId) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }
            const pago = await prisma.pago.findFirst({
                where: {
                    id,
                    clienteId,
                    estado: 'COMPLETADO'
                }
            });
            if (!pago) {
                return res.status(404).json({
                    success: false,
                    message: 'Pago no encontrado o no es elegible para reembolso'
                });
            }
            if (pago.estado === 'REEMBOLSADO') {
                return res.status(400).json({
                    success: false,
                    message: 'Este pago ya fue reembolsado'
                });
            }
            const pagoReembolsado = await prisma.pago.update({
                where: { id },
                data: {
                    estado: 'REEMBOLSADO',
                    descripcion: motivo ? `Reembolsado: ${motivo}` : 'Reembolsado'
                },
                include: {
                    metodoPago: true,
                    cliente: {
                        select: {
                            id: true,
                            nombre: true,
                            email: true
                        }
                    }
                }
            });
            return res.json({
                success: true,
                data: pagoReembolsado,
                message: 'Reembolso procesado exitosamente'
            });
        }
        catch (error) {
            console.error('Error al procesar reembolso:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    },
    consultarEstado: async (req, res) => {
        try {
            const { id } = req.params;
            const clienteId = req.user?.id;
            if (!clienteId) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }
            const pago = await prisma.pago.findFirst({
                where: {
                    id,
                    clienteId
                },
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
                                            precio: true
                                        }
                                    }
                                }
                            }
                        }
                    },
                    suscripcion: {
                        select: {
                            id: true,
                            fechaInicio: true,
                            fechaFin: true,
                            estado: true
                        }
                    }
                }
            });
            if (!pago) {
                return res.status(404).json({
                    success: false,
                    message: 'Pago no encontrado'
                });
            }
            const estadoDetallado = {
                ...pago,
                tiempoTranscurrido: pago.createdAt ?
                    Date.now() - pago.createdAt.getTime() : 0,
                esPendiente: pago.estado === 'PENDIENTE',
                esCompletado: pago.estado === 'COMPLETADO',
                esFallido: pago.estado === 'FALLIDO',
                esReembolsado: pago.estado === 'REEMBOLSADO',
                puedeReembolsarse: pago.estado === 'COMPLETADO',
                itemsCount: pago.carrito?.items?.reduce((total, item) => total + item.cantidad, 0) || 0
            };
            return res.json({
                success: true,
                data: estadoDetallado
            });
        }
        catch (error) {
            console.error('Error al consultar estado del pago:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    },
    procesarPagoCompletado: async (pagoId) => {
        try {
            const pago = await prisma.pago.findUnique({
                where: { id: pagoId },
                include: {
                    carrito: {
                        include: {
                            items: {
                                include: {
                                    servicio: true
                                }
                            }
                        }
                    },
                    cliente: true
                }
            });
            if (!pago || !pago.carrito) {
                throw new Error('Pago o carrito no encontrado');
            }
            if (pago.estado !== 'COMPLETADO') {
                throw new Error('El pago no está en estado COMPLETADO');
            }
            const suscripcionesCreadas = [];
            const credencialesAsignadas = [];
            const fechaInicio = new Date();
            const fechaFin = new Date();
            fechaFin.setMonth(fechaFin.getMonth() + 1);
            for (const item of pago.carrito.items) {
                const suscripcionExistente = await prisma.suscripcion.findFirst({
                    where: {
                        clienteId: pago.clienteId,
                        servicioId: item.servicioId,
                        estado: 'ACTIVA'
                    }
                });
                if (!suscripcionExistente) {
                    const suscripcion = await prisma.suscripcion.create({
                        data: {
                            clienteId: pago.clienteId,
                            servicioId: item.servicioId,
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
                    suscripcionesCreadas.push(suscripcion);
                    const credencial = await (0, credencialesController_1.asignarCredencial)(item.servicioId, pago.clienteId, suscripcion.id);
                    credencialesAsignadas.push(credencial);
                }
            }
            await prisma.carrito.update({
                where: { id: pago.carrito.id },
                data: { activo: false }
            });
            return {
                suscripcionesCreadas,
                credencialesAsignadas,
                carritoDesactivado: true
            };
        }
        catch (error) {
            console.error('Error al procesar pago completado:', error);
            throw error;
        }
    },
    completar: async (req, res) => {
        try {
            const { id } = req.params;
            const clienteId = req.user?.id;
            if (!clienteId) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }
            const pago = await prisma.pago.findFirst({
                where: {
                    id,
                    clienteId
                }
            });
            if (!pago) {
                return res.status(404).json({
                    success: false,
                    message: 'Pago no encontrado'
                });
            }
            if (pago.estado === 'COMPLETADO') {
                return res.status(400).json({
                    success: false,
                    message: 'El pago ya está completado'
                });
            }
            if (pago.estado !== 'PENDIENTE') {
                return res.status(400).json({
                    success: false,
                    message: 'Solo se pueden completar pagos en estado PENDIENTE'
                });
            }
            const pagoActualizado = await prisma.pago.update({
                where: { id },
                data: { estado: 'COMPLETADO' }
            });
            const filtroRelacion = { clienteId, estado: 'PENDIENTE', NOT: { id } };
            if (pago.suscripcionId) {
                filtroRelacion.suscripcionId = pago.suscripcionId;
            }
            else if (pago.carritoId) {
                filtroRelacion.carritoId = pago.carritoId;
            }
            if (filtroRelacion.suscripcionId || filtroRelacion.carritoId) {
                await prisma.pago.updateMany({
                    where: filtroRelacion,
                    data: {
                        estado: 'FALLIDO',
                        descripcion: 'Reemplazado por pago completado ' + id
                    }
                });
            }
            const resultado = await exports.pagoController.procesarPagoCompletado(id);
            return res.json({
                success: true,
                data: {
                    pago: pagoActualizado,
                    procesamiento: resultado
                },
                message: 'Pago completado y procesado exitosamente'
            });
        }
        catch (error) {
            console.error('Error al completar pago:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    },
    procesarCompletados: async (req, res) => {
        try {
            const clienteId = req.user?.id;
            if (!clienteId) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }
            const pagosNoProcessados = await prisma.pago.findMany({
                where: {
                    clienteId,
                    estado: 'COMPLETADO',
                    carrito: {
                        activo: true
                    }
                },
                include: {
                    carrito: {
                        include: {
                            items: {
                                include: {
                                    servicio: true
                                }
                            }
                        }
                    }
                }
            });
            if (pagosNoProcessados.length === 0) {
                return res.json({
                    success: true,
                    data: {
                        pagosProcessados: 0,
                        mensaje: 'No hay pagos completados pendientes de procesar'
                    }
                });
            }
            const resultados = [];
            let procesadosExitosos = 0;
            let errores = 0;
            for (const pago of pagosNoProcessados) {
                try {
                    const resultado = await exports.pagoController.procesarPagoCompletado(pago.id);
                    resultados.push({
                        pagoId: pago.id,
                        monto: pago.monto,
                        estado: 'procesado',
                        suscripcionesCreadas: resultado.suscripcionesCreadas.length,
                        credencialesAsignadas: resultado.credencialesAsignadas.length
                    });
                    procesadosExitosos++;
                }
                catch (error) {
                    console.error(`Error procesando pago ${pago.id}:`, error);
                    resultados.push({
                        pagoId: pago.id,
                        monto: pago.monto,
                        estado: 'error',
                        error: error instanceof Error ? error.message : 'Error desconocido'
                    });
                    errores++;
                }
            }
            return res.json({
                success: true,
                data: {
                    totalEncontrados: pagosNoProcessados.length,
                    procesadosExitosos,
                    errores,
                    resultados
                },
                message: `Procesamiento completado: ${procesadosExitosos} exitosos, ${errores} errores`
            });
        }
        catch (error) {
            console.error('Error al procesar pagos completados:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
};
//# sourceMappingURL=pagoController.js.map