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
exports.qrController = void 0;
const client_1 = require("@prisma/client");
const qrcode_1 = __importDefault(require("qrcode"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma = new client_1.PrismaClient();
exports.qrController = {
    generarQR: async (req, res) => {
        try {
            const { pagoId, tiempoExpiracion = 3 } = req.body;
            const clienteId = req.user?.id;
            if (!clienteId) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }
            const pago = await prisma.pago.findFirst({
                where: {
                    id: pagoId,
                    clienteId,
                    estado: 'PENDIENTE'
                }
            });
            if (!pago) {
                return res.status(404).json({
                    success: false,
                    message: 'Pago no encontrado o no está pendiente'
                });
            }
            const obtenerImagenQR = async (codigoQR) => {
                const customQrPath = process.env.QR_IMAGE_PATH || path_1.default.join(__dirname, '../../uploads/qr/default.png');
                if (customQrPath && fs_1.default.existsSync(customQrPath)) {
                    const buffer = await fs_1.default.promises.readFile(customQrPath);
                    const base64 = buffer.toString('base64');
                    return `data:image/png;base64,${base64}`;
                }
                return await qrcode_1.default.toDataURL(codigoQR);
            };
            const qrExistente = await prisma.qR.findFirst({
                where: {
                    pagoId,
                    estado: 'ACTIVO',
                    expiresAt: {
                        gt: new Date()
                    }
                }
            });
            if (qrExistente) {
                const qrImage = await obtenerImagenQR(qrExistente.codigo);
                return res.json({
                    success: true,
                    data: {
                        ...qrExistente,
                        qrImage
                    },
                    message: 'QR existente encontrado'
                });
            }
            const codigo = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + tiempoExpiracion);
            const qr = await prisma.qR.create({
                data: {
                    codigo,
                    pagoId,
                    estado: 'ACTIVO',
                    expiresAt
                },
                include: {
                    pago: {
                        include: {
                            cliente: {
                                select: {
                                    id: true,
                                    nombre: true,
                                    email: true
                                }
                            },
                            metodoPago: true
                        }
                    }
                }
            });
            const qrImage = await obtenerImagenQR(codigo);
            return res.status(201).json({
                success: true,
                data: {
                    ...qr,
                    qrImage,
                    tiempoRestante: Math.floor((expiresAt.getTime() - Date.now()) / 1000)
                },
                message: 'QR generado exitosamente'
            });
        }
        catch (error) {
            console.error('Error al generar QR:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    },
    validarQR: async (req, res) => {
        try {
            const { codigo } = req.params;
            const qr = await prisma.qR.findUnique({
                where: { codigo },
                include: {
                    pago: {
                        include: {
                            cliente: {
                                select: {
                                    id: true,
                                    nombre: true,
                                    email: true
                                }
                            },
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
                            }
                        }
                    }
                }
            });
            if (!qr) {
                return res.status(404).json({
                    success: false,
                    message: 'Código QR no encontrado'
                });
            }
            const ahora = new Date();
            const haExpirado = qr.expiresAt < ahora;
            if (haExpirado && qr.estado === 'ACTIVO') {
                await prisma.qR.update({
                    where: { id: qr.id },
                    data: { estado: 'EXPIRADO' }
                });
            }
            const esValido = qr.estado === 'ACTIVO' && !haExpirado;
            const tiempoRestante = haExpirado ? 0 : Math.floor((qr.expiresAt.getTime() - ahora.getTime()) / 1000);
            const validacion = {
                esValido,
                estado: haExpirado ? 'EXPIRADO' : qr.estado,
                tiempoRestante,
                motivo: !esValido ? (haExpirado ? 'QR expirado' : `QR en estado: ${qr.estado}`) : null
            };
            return res.json({
                success: true,
                data: {
                    qr: {
                        id: qr.id,
                        codigo: qr.codigo,
                        estado: validacion.estado,
                        createdAt: qr.createdAt,
                        expiresAt: qr.expiresAt
                    },
                    pago: qr.pago,
                    validacion
                }
            });
        }
        catch (error) {
            console.error('Error al validar QR:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    },
    consultarEstadoQR: async (req, res) => {
        try {
            const { id } = req.params;
            const clienteId = req.user?.id;
            if (!clienteId) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }
            const qr = await prisma.qR.findFirst({
                where: {
                    id,
                    pago: {
                        clienteId
                    }
                },
                include: {
                    pago: {
                        include: {
                            cliente: {
                                select: {
                                    id: true,
                                    nombre: true,
                                    email: true
                                }
                            },
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
                            }
                        }
                    }
                }
            });
            if (!qr) {
                return res.status(404).json({
                    success: false,
                    message: 'QR no encontrado'
                });
            }
            const ahora = new Date();
            const haExpirado = qr.expiresAt < ahora;
            const tiempoRestante = haExpirado ? 0 : Math.floor((qr.expiresAt.getTime() - ahora.getTime()) / 1000);
            const tiempoTranscurrido = Math.floor((ahora.getTime() - qr.createdAt.getTime()) / 1000);
            let estadoQRActualizado = qr.estado;
            if (qr.pago.estado === 'COMPLETADO' && qr.estado === 'ACTIVO') {
                await prisma.qR.update({
                    where: { id: qr.id },
                    data: { estado: 'USADO' }
                });
                estadoQRActualizado = 'USADO';
            }
            else if (haExpirado && qr.estado === 'ACTIVO') {
                await prisma.qR.update({
                    where: { id: qr.id },
                    data: { estado: 'EXPIRADO' }
                });
                estadoQRActualizado = 'EXPIRADO';
            }
            const estadoDetallado = {
                ...qr,
                estado: estadoQRActualizado,
                tiempoRestante,
                tiempoTranscurrido,
                haExpirado,
                esActivo: estadoQRActualizado === 'ACTIVO' && !haExpirado,
                esUsado: estadoQRActualizado === 'USADO',
                esExpirado: haExpirado || estadoQRActualizado === 'EXPIRADO',
                porcentajeVida: Math.max(0, Math.min(100, (tiempoRestante / (3 * 60)) * 100))
            };
            return res.json({
                success: true,
                data: estadoDetallado
            });
        }
        catch (error) {
            console.error('Error al consultar estado del QR:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    },
    usarQR: async (req, res) => {
        try {
            const { codigo } = req.params;
            const qr = await prisma.qR.findUnique({
                where: { codigo },
                include: {
                    pago: true
                }
            });
            if (!qr) {
                return res.status(404).json({
                    success: false,
                    message: 'Código QR no encontrado'
                });
            }
            const ahora = new Date();
            const haExpirado = qr.expiresAt < ahora;
            if (haExpirado || qr.estado !== 'ACTIVO') {
                return res.status(400).json({
                    success: false,
                    message: 'QR no válido o expirado'
                });
            }
            const [qrActualizado, pagoActualizado] = await prisma.$transaction([
                prisma.qR.update({
                    where: { id: qr.id },
                    data: { estado: 'USADO' }
                }),
                prisma.pago.update({
                    where: { id: qr.pagoId },
                    data: {
                        estado: 'COMPLETADO'
                    }
                })
            ]);
            const { pagoController } = await Promise.resolve().then(() => __importStar(require('./pagoController')));
            const resultadoProcesamiento = await pagoController.procesarPagoCompletado(qr.pagoId);
            return res.json({
                success: true,
                data: {
                    qr: qrActualizado,
                    pago: pagoActualizado,
                    procesamiento: resultadoProcesamiento
                },
                message: 'QR procesado y pago completado exitosamente'
            });
        }
        catch (error) {
            console.error('Error al usar QR:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
};
//# sourceMappingURL=qrController.js.map