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
exports.ValidacionOCRController = void 0;
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
        const errores = [];
        if (datosComprobante.monto) {
            const montoComprobante = parseFloat(datosComprobante.monto.replace(/[^0-9.-]+/g, ''));
            const montoPago = parseFloat(pago.monto);
            const tolerancia = montoPago * 0.01;
            if (Math.abs(montoComprobante - montoPago) <= tolerancia) {
                coincidencias.monto = true;
            }
            else {
                errores.push(`Monto no coincide: $${montoComprobante} vs $${montoPago}`);
            }
        }
        else {
            errores.push('No se detectó monto en el comprobante');
        }
        if (datosComprobante.fecha) {
            const fechaComprobante = new Date(datosComprobante.fecha);
            const fechaPago = new Date(pago.createdAt);
            const diferenciaDias = Math.abs((fechaComprobante.getTime() - fechaPago.getTime()) / (1000 * 60 * 60 * 24));
            if (diferenciaDias <= 1) {
                coincidencias.fecha = true;
            }
            else {
                errores.push(`Fecha no coincide: ${datosComprobante.fecha} vs ${pago.createdAt.toISOString().split('T')[0]}`);
            }
        }
        else {
            errores.push('No se detectó fecha en el comprobante');
        }
        if (datosComprobante.referencia && pago.referencia) {
            if (datosComprobante.referencia.toLowerCase().includes(pago.referencia.toLowerCase()) ||
                pago.referencia.toLowerCase().includes(datosComprobante.referencia.toLowerCase())) {
                coincidencias.referencia = true;
            }
            else {
                errores.push(`Referencia no coincide: ${datosComprobante.referencia} vs ${pago.referencia}`);
            }
        }
        if (datosComprobante.transaccion) {
            coincidencias.transaccion = true;
        }
        const totalCoincidencias = Object.values(coincidencias).filter(Boolean).length;
        const porcentajeCoincidencia = (totalCoincidencias / 4) * 100;
        const esValido = porcentajeCoincidencia >= 75;
        return {
            esValido,
            coincidencias,
            porcentajeCoincidencia,
            errores
        };
    }
}
exports.ValidacionOCRController = ValidacionOCRController;
//# sourceMappingURL=validacionOCRController.js.map