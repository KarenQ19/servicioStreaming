import { Request, Response } from 'express';
import { prisma } from '../utils/database';
import { OCRService } from '../services/ocrService';

/**
 * Controlador para validación de comprobantes mediante OCR
 */
export class ValidacionOCRController {

  /**
   * Validar comprobante de pago mediante OCR
   */
  static async validarComprobante(req: Request, res: Response): Promise<void> {
    try {
      const { pagoId } = req.params;
      const userId = (req as any).user?.id;

      if (!req.file) {
        res.status(400).json({
          exito: false,
          error: 'No se proporciono archivo de comprobante'
        });
        return;
      }

      const pago = await prisma.pago.findUnique({
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

      await prisma.pago.update({
        where: { id: pago.id },
        data: {
          comprobanteUrl: req.file.path
        }
      });

      const ocrService = OCRService.getInstance();
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

      const intentoValidacion = await prisma.validacionOCR.create({
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
        const pagoActualizado = await prisma.pago.update({
          where: { id: pago.id },
          data: {
            estado: 'COMPLETADO',
            fechaValidacion: new Date(),
            validadoPor: 'OCR',
            comprobanteUrl: req.file.path
          }
        });

        let procesamiento: any = null;
        try {
          if (pagoActualizado.carritoId) {
            const { pagoController } = await import('./pagoController');
            procesamiento = await pagoController.procesarPagoCompletado(pagoActualizado.id);
          }
        } catch (procError) {
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
      } else {
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

    } catch (error) {
      console.error('Error en validacion OCR:', error);
      res.status(500).json({
        exito: false,
        error: 'Error interno al procesar la validacion'
      });
    }
  }


  /**
   * Obtener historial de validaciones OCR del usuario
   */
  static async obtenerHistorialValidaciones(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { pagina = 1, limite = 10, estado } = req.query;

      const skip = (Number(pagina) - 1) * Number(limite);

      const where: any = { usuarioId: userId };
      if (estado) {
        where.esValido = estado === 'valido';
      }

      const validaciones = await prisma.validacionOCR.findMany({
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

      const total = await prisma.validacionOCR.count({ where });

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

    } catch (error) {
      console.error('Error obteniendo historial de validaciones:', error);
      res.status(500).json({
        exito: false,
        error: 'Error interno al obtener el historial'
      });
    }
  }

  /**
   * Validar datos extraídos contra información del pago
   */
  private static async validarDatosContraPago(
    datosComprobante: any,
    pago: any
  ): Promise<any> {
    const coincidencias = {
      monto: false,
      fecha: false,
      referencia: false,
      transaccion: false
    };

    const errores: string[] = [];

    // Validar monto (con tolerancia de ±1%)
    if (datosComprobante.monto) {
      const montoComprobante = parseFloat(datosComprobante.monto.replace(/[^0-9.-]+/g, ''));
      const montoPago = parseFloat(pago.monto);
      const tolerancia = montoPago * 0.01; // 1% de tolerancia

      if (Math.abs(montoComprobante - montoPago) <= tolerancia) {
        coincidencias.monto = true;
      } else {
        errores.push(`Monto no coincide: $${montoComprobante} vs $${montoPago}`);
      }
    } else {
      errores.push('No se detectó monto en el comprobante');
    }

    // Validar fecha (misma fecha o máximo 1 día de diferencia)
    if (datosComprobante.fecha) {
      const fechaComprobante = new Date(datosComprobante.fecha);
      const fechaPago = new Date(pago.createdAt);
      const diferenciaDias = Math.abs(
        (fechaComprobante.getTime() - fechaPago.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diferenciaDias <= 1) {
        coincidencias.fecha = true;
      } else {
        errores.push(`Fecha no coincide: ${datosComprobante.fecha} vs ${pago.createdAt.toISOString().split('T')[0]}`);
      }
    } else {
      errores.push('No se detectó fecha en el comprobante');
    }

    // Validar referencia (si existe)
    if (datosComprobante.referencia && pago.referencia) {
      if (datosComprobante.referencia.toLowerCase().includes(pago.referencia.toLowerCase()) ||
          pago.referencia.toLowerCase().includes(datosComprobante.referencia.toLowerCase())) {
        coincidencias.referencia = true;
      } else {
        errores.push(`Referencia no coincide: ${datosComprobante.referencia} vs ${pago.referencia}`);
      }
    }

    // Validar número de transacción (si existe)
    if (datosComprobante.transaccion) {
      coincidencias.transaccion = true; // Siempre contamos como válido si se detectó
    }

    const totalCoincidencias = Object.values(coincidencias).filter(Boolean).length;
    const porcentajeCoincidencia = (totalCoincidencias / 4) * 100;

    // Considerar válido si hay al menos 75% de coincidencia
    const esValido = porcentajeCoincidencia >= 75;

    return {
      esValido,
      coincidencias,
      porcentajeCoincidencia,
      errores
    };
  }
}
