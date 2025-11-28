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
exports.obtenerImagenValidacionAdmin = exports.obtenerHistorialValidacionesAdmin = exports.ValidacionOCRController = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = require("../utils/database");
const ocrService_1 = require("../services/ocrService");
class ValidacionOCRController {
    static async validarComprobante(req, res) {
        try {
            const { pagoId } = req.params;
            const userId = req.user?.id;
            if (!req.file) {
                res.status(400).json({
                    exito: false,
                    error: 'No se proporciono archivo de comprobante'
                });
                return;
            }
            const pago = await database_1.prisma.pago.findUnique({
                where: { id: pagoId },
                include: {
                    cliente: true,
                    qr: true
                }
            });
            if (!pago) {
                res.status(404).json({
                    exito: false,
                    error: 'Pago no encontrado'
                });
                return;
            }
            if (pago.clienteId !== userId) {
                res.status(403).json({
                    exito: false,
                    error: 'No tienes permisos para validar este pago'
                });
                return;
            }
            if (!['PENDIENTE', 'COMPLETADO'].includes(pago.estado)) {
                res.status(400).json({
                    exito: false,
                    error: `El pago esta ${pago.estado.toLowerCase()}`
                });
                return;
            }
            await database_1.prisma.pago.update({
                where: { id: pago.id },
                data: {
                    comprobanteUrl: req.file.path
                }
            });
            const ocrService = ocrService_1.OCRService.getInstance();
            const resultadoOCR = await ocrService.procesarImagen(req.file.path);
            if (!resultadoOCR.exito) {
                res.status(400).json({
                    exito: false,
                    error: resultadoOCR.error
                });
                return;
            }
            const datosComprobante = resultadoOCR.datos;
            const validacion = await ValidacionOCRController.validarDatosContraPago(datosComprobante, pago);
            const intentoValidacion = await database_1.prisma.validacionOCR.create({
                data: {
                    pagoId: pago.id,
                    usuarioId: userId,
                    imagenUrl: req.file.path,
                    textoExtraido: resultadoOCR.texto,
                    datosExtraidos: datosComprobante,
                    confianzaOCR: resultadoOCR.confianza,
                    montoDetectado: datosComprobante.monto,
                    fechaDetectada: datosComprobante.fecha,
                    referenciaDetectada: datosComprobante.referencia,
                    transaccionDetectada: datosComprobante.transaccion,
                    bancoDetectado: datosComprobante.banco,
                    esValido: validacion.esValido,
                    coincidenciaMonto: validacion.coincidencias.monto,
                    coincidenciaFecha: validacion.coincidencias.fecha,
                    coincidenciaReferencia: validacion.coincidencias.referencia,
                    coincidenciaTransaccion: validacion.coincidencias.transaccion,
                    porcentajeCoincidencia: validacion.porcentajeCoincidencia
                }
            });
            if (validacion.esValido) {
                const pagoActualizado = await database_1.prisma.pago.update({
                    where: { id: pago.id },
                    data: {
                        estado: 'COMPLETADO',
                        fechaValidacion: new Date(),
                        validadoPor: 'OCR',
                        comprobanteUrl: req.file.path
                    }
                });
                let procesamiento = null;
                try {
                    if (pagoActualizado.carritoId) {
                        const { pagoController } = await Promise.resolve().then(() => __importStar(require('./pagoController')));
                        procesamiento = await pagoController.procesarPagoCompletado(pagoActualizado.id);
                    }
                }
                catch (procError) {
                    console.error('Error procesando pago tras validacion OCR:', procError);
                }
                res.json({
                    exito: true,
                    mensaje: 'Comprobante validado exitosamente',
                    validacion: {
                        esValido: true,
                        porcentajeCoincidencia: validacion.porcentajeCoincidencia,
                        coincidencias: validacion.coincidencias,
                        datosExtraidos: datosComprobante,
                        pagoActualizado: true,
                        procesamiento
                    },
                    intentoValidacionId: intentoValidacion.id
                });
            }
            else {
                res.json({
                    exito: true,
                    mensaje: 'Validacion completada con errores',
                    validacion: {
                        esValido: false,
                        porcentajeCoincidencia: validacion.porcentajeCoincidencia,
                        coincidencias: validacion.coincidencias,
                        datosExtraidos: datosComprobante,
                        pagoActualizado: false,
                        errores: validacion.errores
                    },
                    intentoValidacionId: intentoValidacion.id
                });
            }
        }
        catch (error) {
            console.error('Error en validacion OCR:', error);
            res.status(500).json({
                exito: false,
                error: 'Error interno al procesar la validacion'
            });
        }
    }
    static async obtenerHistorialValidaciones(req, res) {
        try {
            const userId = req.user?.id;
            const { pagina = 1, limite = 10, estado } = req.query;
            const skip = (Number(pagina) - 1) * Number(limite);
            const where = { usuarioId: userId };
            if (estado) {
                where.esValido = estado === 'valido';
            }
            const validaciones = await database_1.prisma.validacionOCR.findMany({
                where,
                include: {
                    pago: {
                        select: {
                            id: true,
                            monto: true,
                            estado: true,
                            createdAt: true,
                            qr: {
                                select: {
                                    codigo: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: Number(limite)
            });
            const total = await database_1.prisma.validacionOCR.count({ where });
            res.json({
                exito: true,
                datos: {
                    validaciones,
                    paginacion: {
                        pagina: Number(pagina),
                        limite: Number(limite),
                        total,
                        totalPaginas: Math.ceil(total / Number(limite))
                    }
                }
            });
        }
        catch (error) {
            console.error('Error obteniendo historial de validaciones:', error);
            res.status(500).json({
                exito: false,
                error: 'Error interno al obtener el historial'
            });
        }
    }
    static async validarDatosContraPago(datosComprobante, pago) {
        const coincidencias = {
            monto: false,
            fecha: false,
            referencia: false,
            transaccion: false
        };
        const normalizarFecha = (texto) => {
            if (!texto)
                return null;
            const match = texto.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
            if (match) {
                const [, dd, mm, yyyy] = match;
                return `${yyyy}-${mm}-${dd}`;
            }
            return texto;
        };
        const errores = [];
        if (datosComprobante.monto) {
            const montoComprobante = Number(parseFloat(datosComprobante.monto.replace(/[^0-9.-]+/g, '')).toFixed(2));
            const montoPago = Number(parseFloat(pago.monto).toFixed(2));
            const tolerancia = Math.max(montoPago * 0.02, 0.5);
            if (Math.abs(montoComprobante - montoPago) <= tolerancia) {
                coincidencias.monto = true;
            }
            else {
                errores.push(`Monto no coincide: $${montoComprobante} vs $${montoPago}`);
            }
        }
        else {
            errores.push('No se detecto monto en el comprobante');
        }
        const fechaNormalizada = normalizarFecha(datosComprobante.fecha);
        if (fechaNormalizada) {
            const fechaComprobante = new Date(`${fechaNormalizada}T00:00:00Z`);
            const fechaPagoISO = pago.createdAt.toISOString().split('T')[0];
            const fechaPago = new Date(`${fechaPagoISO}T00:00:00Z`);
            const diferenciaDias = Math.abs((fechaComprobante.getTime() - fechaPago.getTime()) / (1000 * 60 * 60 * 24));
            if (!isNaN(fechaComprobante.getTime()) && diferenciaDias <= 1) {
                coincidencias.fecha = true;
            }
            else {
                errores.push(`Fecha no coincide: ${fechaNormalizada} vs ${fechaPagoISO}`);
            }
        }
        else {
            errores.push('No se detecto fecha en el comprobante');
        }
        if (datosComprobante.referencia) {
            if (!pago.referencia) {
                coincidencias.referencia = true;
            }
            else {
                const refComprobante = datosComprobante.referencia.trim().toLowerCase();
                const refPago = pago.referencia.trim().toLowerCase();
                if (refComprobante.includes(refPago) || refPago.includes(refComprobante)) {
                    coincidencias.referencia = true;
                }
                else {
                    errores.push(`Referencia no coincide: ${datosComprobante.referencia} vs ${pago.referencia}`);
                }
            }
        }
        if (datosComprobante.transaccion) {
            coincidencias.transaccion = true;
        }
        const tieneValor = (valor) => valor !== undefined && valor !== null && `${valor}`.trim() !== '';
        const camposPresentes = [
            datosComprobante.monto,
            datosComprobante.fecha,
            datosComprobante.referencia,
            datosComprobante.transaccion
        ].filter(tieneValor).length || 1;
        const totalCoincidencias = Object.values(coincidencias).filter(Boolean).length;
        const porcentajeCoincidencia = (totalCoincidencias / camposPresentes) * 100;
        const esValido = (coincidencias.monto && coincidencias.fecha) || porcentajeCoincidencia >= 70;
        return {
            esValido,
            coincidencias,
            porcentajeCoincidencia,
            errores
        };
    }
}
exports.ValidacionOCRController = ValidacionOCRController;
const obtenerHistorialValidacionesAdmin = async (req, res) => {
    try {
        const { pagina = 1, limite = 10 } = req.query;
        const skip = (Number(pagina) - 1) * Number(limite);
        const validaciones = await database_1.prisma.validacionOCR.findMany({
            include: {
                pago: {
                    include: {
                        cliente: { select: { id: true, nombre: true, email: true } },
                        suscripcion: {
                            include: {
                                servicio: { select: { id: true, nombre: true, precio: true } }
                            }
                        },
                        carrito: {
                            include: {
                                items: {
                                    include: {
                                        servicio: { select: { id: true, nombre: true, precio: true } }
                                    }
                                }
                            }
                        }
                    }
                },
                usuario: { select: { id: true, nombre: true, email: true } }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: Number(limite)
        });
        const total = await database_1.prisma.validacionOCR.count();
        res.json({
            exito: true,
            datos: {
                validaciones,
                paginacion: {
                    pagina: Number(pagina),
                    limite: Number(limite),
                    total,
                    totalPaginas: Math.ceil(total / Number(limite))
                }
            }
        });
    }
    catch (error) {
        console.error('Error obteniendo historial OCR admin:', error);
        res.status(500).json({
            exito: false,
            error: 'Error interno al obtener el historial OCR'
        });
    }
};
exports.obtenerHistorialValidacionesAdmin = obtenerHistorialValidacionesAdmin;
const obtenerImagenValidacionAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const validacion = await database_1.prisma.validacionOCR.findUnique({
            where: { id },
            select: { imagenUrl: true }
        });
        if (!validacion || !validacion.imagenUrl) {
            res.status(404).json({ exito: false, error: 'Imagen no encontrada' });
            return;
        }
        const absolutePath = path_1.default.isAbsolute(validacion.imagenUrl)
            ? validacion.imagenUrl
            : path_1.default.resolve(validacion.imagenUrl);
        if (!fs_1.default.existsSync(absolutePath)) {
            res.status(404).json({ exito: false, error: 'Archivo no disponible' });
            return;
        }
        res.sendFile(absolutePath);
    }
    catch (error) {
        console.error('Error obteniendo imagen de validación OCR:', error);
        res.status(500).json({ exito: false, error: 'Error interno al obtener la imagen' });
    }
};
exports.obtenerImagenValidacionAdmin = obtenerImagenValidacionAdmin;
//# sourceMappingURL=validacionOCRController.js.map