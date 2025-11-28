import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
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

    // Normaliza fechas en formato dd-mm-aaaa o dd/mm/aaaa a ISO yyyy-mm-dd
    const normalizarFecha = (texto: string | undefined) => {
      if (!texto) return null;
      const match = texto.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
      if (match) {
        const [, dd, mm, yyyy] = match;
        return `${yyyy}-${mm}-${dd}`;
      }
      return texto;
    };

    const errores: string[] = [];

    // Validar monto (con tolerancia de ±1%)
    if (datosComprobante.monto) {
      const montoComprobante = Number(parseFloat(datosComprobante.monto.replace(/[^0-9.-]+/g, '')).toFixed(2));
      const montoPago = Number(parseFloat(pago.monto).toFixed(2));
      // Tolerancia mayor para evitar fallos por redondeo/decimales
      const tolerancia = Math.max(montoPago * 0.02, 0.5); // 2% o $0.5, lo que sea mayor

      if (Math.abs(montoComprobante - montoPago) <= tolerancia) {
        coincidencias.monto = true;
      } else {
        errores.push(`Monto no coincide: $${montoComprobante} vs $${montoPago}`);
      }
    } else {
      errores.push('No se detecto monto en el comprobante');
    }

    // Validar fecha (misma fecha o maximo 1 dia de diferencia)
    const fechaNormalizada = normalizarFecha(datosComprobante.fecha);
    if (fechaNormalizada) {
      // Comparar por fecha de calendario (ignorando horas/zona) para evitar falsos negativos por TZ
      const fechaComprobante = new Date(`${fechaNormalizada}T00:00:00Z`);
      const fechaPagoISO = pago.createdAt.toISOString().split('T')[0];
      const fechaPago = new Date(`${fechaPagoISO}T00:00:00Z`);

      const diferenciaDias = Math.abs(
        (fechaComprobante.getTime() - fechaPago.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (!isNaN(fechaComprobante.getTime()) && diferenciaDias <= 1) {
        coincidencias.fecha = true;
      } else {
        errores.push(`Fecha no coincide: ${fechaNormalizada} vs ${fechaPagoISO}`);
      }
    } else {
      errores.push('No se detecto fecha en el comprobante');
    }

    // Validar referencia (si existe)
    if (datosComprobante.referencia) {
      if (!pago.referencia) {
        // Si el pago no tiene referencia esperada, no penalizar
        coincidencias.referencia = true;
      } else {
        const refComprobante = datosComprobante.referencia.trim().toLowerCase();
        const refPago = pago.referencia.trim().toLowerCase();
        if (refComprobante.includes(refPago) || refPago.includes(refComprobante)) {
          coincidencias.referencia = true;
        } else {
          errores.push(`Referencia no coincide: ${datosComprobante.referencia} vs ${pago.referencia}`);
        }
      }
    }

    // Validar numero de transaccion (si existe)
    if (datosComprobante.transaccion) {
      coincidencias.transaccion = true; // Siempre contamos como valido si se detecta
    }

    const tieneValor = (valor: any) => valor !== undefined && valor !== null && `${valor}`.trim() !== '';
    // Solo contar campos realmente presentes para el porcentaje
    const camposPresentes = [
      datosComprobante.monto,
      datosComprobante.fecha,
      datosComprobante.referencia,
      datosComprobante.transaccion
    ].filter(tieneValor).length || 1;

    const totalCoincidencias = Object.values(coincidencias).filter(Boolean).length;
    const porcentajeCoincidencia = (totalCoincidencias / camposPresentes) * 100;

    // Considerar válido si monto y fecha coinciden, o si supera el 70% de coincidencia
    const esValido = (coincidencias.monto && coincidencias.fecha) || porcentajeCoincidencia >= 70;

    return {
      esValido,
      coincidencias,
      porcentajeCoincidencia,
      errores
    };
  }
}

// Historial de validaciones OCR para administradores (todas las validaciones)
export const obtenerHistorialValidacionesAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pagina = 1, limite = 10 } = req.query;
    const skip = (Number(pagina) - 1) * Number(limite);

    const validaciones = await prisma.validacionOCR.findMany({
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

    const total = await prisma.validacionOCR.count();

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
    console.error('Error obteniendo historial OCR admin:', error);
    res.status(500).json({
      exito: false,
      error: 'Error interno al obtener el historial OCR'
    });
  }
};

// Obtener imagen de comprobante para administradores
export const obtenerImagenValidacionAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const validacion = await prisma.validacionOCR.findUnique({
      where: { id },
      select: { imagenUrl: true }
    });

    if (!validacion || !validacion.imagenUrl) {
      res.status(404).json({ exito: false, error: 'Imagen no encontrada' });
      return;
    }

    const absolutePath = path.isAbsolute(validacion.imagenUrl)
      ? validacion.imagenUrl
      : path.resolve(validacion.imagenUrl);

    if (!fs.existsSync(absolutePath)) {
      res.status(404).json({ exito: false, error: 'Archivo no disponible' });
      return;
    }

    res.sendFile(absolutePath);
  } catch (error) {
    console.error('Error obteniendo imagen de validación OCR:', error);
    res.status(500).json({ exito: false, error: 'Error interno al obtener la imagen' });
  }
};
