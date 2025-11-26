const { OCRService } = require('../services/ocrService');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs').promises;

const prisma = new PrismaClient();

/**
 * Controlador para validar comprobantes de pago mediante OCR
 */
class ValidacionOCRController {
  constructor() {
    this.ocrService = OCRService.getInstance();
  }

  /**
   * Valida un comprobante de pago contra un pago QR
   * POST /api/qr/validar-comprobante
   */
  async validarComprobante(req, res) {
    try {
      const { pagoId } = req.body;
      const archivo = req.file;

      if (!archivo) {
        return res.status(400).json({
          exito: false,
          error: 'No se proporcionó archivo de comprobante'
        });
      }

      if (!pagoId) {
        return res.status(400).json({
          exito: false,
          error: 'No se proporcionó ID del pago'
        });
      }

      console.log(`📋 Validando comprobante para pago QR: ${pagoId}`);
      console.log(`📸 Archivo recibido: ${archivo.originalname} (${archivo.size} bytes)`);

      // Obtener información del pago QR
      const pago = await this.obtenerPagoQR(pagoId);
      if (!pago) {
        return res.status(404).json({
          exito: false,
          error: 'Pago QR no encontrado'
        });
      }

      // Procesar imagen con OCR
      const resultadoOCR = await this.ocrService.procesarComprobante(archivo.path);
      
      if (!resultadoOCR.exito) {
        // Limpiar archivo temporal
        await this.limpiarArchivo(archivo.path);
        
        return res.status(400).json({
          exito: false,
          error: 'Error procesando el comprobante',
          detalle: resultadoOCR.error
        });
      }

      // Validar datos extraídos contra el pago QR
      const validacion = this.validarDatosComprobante(resultadoOCR.datos, pago);

      // Registrar intento de validación
      await this.registrarIntentoValidacion(pagoId, resultadoOCR.datos, validacion);

      // Limpiar archivo temporal
      await this.limpiarArchivo(archivo.path);

      // Preparar respuesta
      const respuesta = {
        exito: true,
        validacion: {
          pagoValido: validacion.pagoValido,
          nivelConfianza: validacion.nivelConfianza,
          detalles: validacion.detalles,
          coincidencias: validacion.coincidencias
        },
        datosExtraidos: {
          monto: resultadoOCR.datos.monto,
          fecha: resultadoOCR.datos.fecha,
          referencia: resultadoOCR.datos.referencia,
          numeroTransaccion: resultadoOCR.datos.numeroTransaccion,
          banco: resultadoOCR.datos.banco,
          confianzaOCR: resultadoOCR.datos.confianza
        },
        datosPagoQR: {
          monto: pago.monto,
          referencia: pago.referencia,
          fechaCreacion: pago.fechaCreacion,
          estado: pago.estado
        }
      };

      // Si el pago es válido, actualizar el estado
      if (validacion.pagoValido) {
        await this.actualizarEstadoPago(pagoId, 'VALIDADO_OCR');
        respuesta.mensaje = 'Comprobante validado exitosamente';
      } else {
        respuesta.mensaje = 'Comprobante no válido';
      }

      return res.json(respuesta);

    } catch (error) {
      console.error('❌ Error en validación OCR:', error);
      
      // Limpiar archivo en caso de error
      if (req.file && req.file.path) {
        await this.limpiarArchivo(req.file.path).catch(console.error);
      }

      return res.status(500).json({
        exito: false,
        error: 'Error interno del servidor',
        detalle: error.message
      });
    }
  }

  /**
   * Obtiene la información del pago QR
   */
  async obtenerPagoQR(pagoId) {
    return await prisma.pago.findUnique({
      where: { id: pagoId },
      include: {
        carrito: {
          select: {
            id: true,
            usuarioId: true,
            total: true,
            estado: true
          }
        }
      }
    });
  }

  /**
   * Valida los datos extraídos contra la información del pago QR
   */
  validarDatosComprobante(datosOCR, pagoQR) {
    console.log('🔍 Validando datos del comprobante...');
    
    const validacion = {
      pagoValido: false,
      nivelConfianza: 0,
      detalles: [],
      coincidencias: {}
    };

    let puntajeTotal = 0;
    let puntajeMaximo = 0;

    // 1. Validar monto (40% del puntaje)
    puntajeMaximo += 40;
    if (datosOCR.monto && pagoQR.monto) {
      const diferenciaPorcentual = Math.abs(datosOCR.monto - pagoQR.monto) / pagoQR.monto * 100;
      
      if (diferenciaPorcentual <= 1) { // Tolerancia de 1%
        puntajeTotal += 40;
        validacion.coincidencias.monto = true;
        validacion.detalles.push(`✅ Monto coincide: $${datosOCR.monto.toFixed(2)}`);
      } else if (diferenciaPorcentual <= 5) { // Tolerancia de 5%
        puntajeTotal += 25;
        validacion.coincidencias.monto = 'parcial';
        validacion.detalles.push(`⚠️ Monto similar: OCR $${datosOCR.monto.toFixed(2)} vs QR $${pagoQR.monto.toFixed(2)}`);
      } else {
        validacion.coincidencias.monto = false;
        validacion.detalles.push(`❌ Monto diferente: OCR $${datosOCR.monto.toFixed(2)} vs QR $${pagoQR.monto.toFixed(2)}`);
      }
    } else {
      validacion.coincidencias.monto = false;
      validacion.detalles.push('❌ Monto no detectado en el comprobante');
    }

    // 2. Validar fecha (25% del puntaje)
    puntajeMaximo += 25;
    if (datosOCR.fecha) {
      const fechaActual = new Date();
      const fechaOCR = new Date(datosOCR.fecha);
      const diasDiferencia = Math.abs((fechaActual - fechaOCR) / (1000 * 60 * 60 * 24));
      
      if (diasDiferencia <= 1) { // Mismo día o día anterior
        puntajeTotal += 25;
        validacion.coincidencias.fecha = true;
        validacion.detalles.push(`✅ Fecha válida: ${fechaOCR.toLocaleDateString()}`);
      } else if (diasDiferencia <= 7) { // Dentro de una semana
        puntajeTotal += 15;
        validacion.coincidencias.fecha = 'parcial';
        validacion.detalles.push(`⚠️ Fecha reciente: ${fechaOCR.toLocaleDateString()}`);
      } else {
        validacion.coincidencias.fecha = false;
        validacion.detalles.push(`❌ Fecha antigua: ${fechaOCR.toLocaleDateString()}`);
      }
    } else {
      validacion.coincidencias.fecha = false;
      validacion.detalles.push('❌ Fecha no detectada');
    }

    // 3. Validar número de transacción (20% del puntaje)
    puntajeMaximo += 20;
    if (datosOCR.numeroTransaccion) {
      // Si existe una referencia en el pago QR, validar coincidencia
      if (pagoQR.referencia) {
        if (datosOCR.numeroTransaccion === pagoQR.referencia) {
          puntajeTotal += 20;
          validacion.coincidencias.transaccion = true;
          validacion.detalles.push(`✅ Transacción coincide: ${datosOCR.numeroTransaccion}`);
        } else {
          validacion.coincidencias.transaccion = false;
          validacion.detalles.push(`⚠️ Transacción diferente: OCR ${datosOCR.numeroTransaccion} vs QR ${pagoQR.referencia}`);
        }
      } else {
        // Si no hay referencia en QR, solo verificar que existe
        puntajeTotal += 15;
        validacion.coincidencias.transaccion = 'existe';
        validacion.detalles.push(`✅ Número de transacción detectado: ${datosOCR.numeroTransaccion}`);
      }
    } else {
      validacion.coincidencias.transaccion = false;
      validacion.detalles.push('❌ Número de transacción no detectado');
    }

    // 4. Validar confianza del OCR (15% del puntaje)
    puntajeMaximo += 15;
    if (datosOCR.confianza >= 80) {
      puntajeTotal += 15;
      validacion.coincidencias.confianza = 'alta';
      validacion.detalles.push(`✅ Alta confianza OCR: ${datosOCR.confianza.toFixed(1)}%`);
    } else if (datosOCR.confianza >= 60) {
      puntajeTotal += 10;
      validacion.coincidencias.confianza = 'media';
      validacion.detalles.push(`⚠️ Confianza media OCR: ${datosOCR.confianza.toFixed(1)}%`);
    } else {
      validacion.coincidencias.confianza = 'baja';
      validacion.detalles.push(`❌ Baja confianza OCR: ${datosOCR.confianza.toFixed(1)}%`);
    }

    // Calcular nivel de confianza final
    validacion.nivelConfianza = Math.round((puntajeTotal / puntajeMaximo) * 100);

    // Determinar si el pago es válido (umbral de 75%)
    validacion.pagoValido = validacion.nivelConfianza >= 75;

    console.log(`📊 Validación completada - Confianza: ${validacion.nivelConfianza}%`);
    console.log(`🎯 Pago válido: ${validacion.pagoValido ? 'SÍ' : 'NO'}`);

    return validacion;
  }

  /**
   * Registra el intento de validación en la base de datos
   */
  async registrarIntentoValidacion(pagoId, datosOCR, validacion) {
    try {
      await prisma.validacionOCR.create({
        data: {
          pagoId,
          montoDetectado: datosOCR.monto,
          fechaDetectada: datosOCR.fecha,
          referenciaDetectada: datosOCR.referencia,
          numeroTransaccionDetectado: datosOCR.numeroTransaccion,
          bancoDetectado: datosOCR.banco,
          confianzaOCR: datosOCR.confianza,
          pagoValidado: validacion.pagoValido,
          nivelConfianza: validacion.nivelConfianza,
          detallesValidacion: validacion.detalles,
          textoCompleto: datosOCR.textoCompleto
        }
      });
      
      console.log('✅ Intento de validación registrado');
    } catch (error) {
      console.error('⚠️ Error registrando validación:', error);
    }
  }

  /**
   * Actualiza el estado del pago
   */
  async actualizarEstadoPago(pagoId, nuevoEstado) {
    try {
      await prisma.pago.update({
        where: { id: pagoId },
        data: { 
          estado: nuevoEstado,
          fechaActualizacion: new Date()
        }
      });
      
      console.log(`✅ Estado del pago actualizado a: ${nuevoEstado}`);
    } catch (error) {
      console.error('⚠️ Error actualizando estado del pago:', error);
    }
  }

  /**
   * Limpia el archivo temporal
   */
  async limpiarArchivo(rutaArchivo) {
    try {
      await fs.unlink(rutaArchivo);
      console.log('🗑️ Archivo temporal eliminado');
    } catch (error) {
      console.error('⚠️ Error eliminando archivo:', error);
    }
  }

  /**
   * Obtiene el historial de validaciones OCR para un pago
   * GET /api/qr/validaciones/:pagoId
   */
  async obtenerValidaciones(req, res) {
    try {
      const { pagoId } = req.params;

      const validaciones = await prisma.validacionOCR.findMany({
        where: { pagoId },
        orderBy: { fechaCreacion: 'desc' }
      });

      return res.json({
        exito: true,
        validaciones: validaciones.map(v => ({
          id: v.id,
          fechaCreacion: v.fechaCreacion,
          montoDetectado: v.montoDetectado,
          fechaDetectada: v.fechaDetectada,
          referenciaDetectada: v.referenciaDetectada,
          numeroTransaccionDetectado: v.numeroTransaccionDetectado,
          bancoDetectado: v.bancoDetectado,
          confianzaOCR: v.confianzaOCR,
          pagoValidado: v.pagoValidado,
          nivelConfianza: v.nivelConfianza,
          detallesValidacion: v.detallesValidacion
        }))
      });

    } catch (error) {
      console.error('❌ Error obteniendo validaciones:', error);
      return res.status(500).json({
        exito: false,
        error: 'Error obteniendo validaciones'
      });
    }
  }
}

module.exports = { ValidacionOCRController };