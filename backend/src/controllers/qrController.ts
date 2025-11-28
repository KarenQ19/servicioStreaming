import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export const qrController = {
  // POST /api/qr/generar
  generarQR: async (req: Request, res: Response) => {
    try {
      const { pagoId, tiempoExpiracion = 3 } = req.body; // 3 minutos por defecto
      const clienteId = (req.user as any)?.id;

      if (!clienteId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que el pago existe y pertenece al cliente
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

      const obtenerImagenQR = async (codigoQR: string) => {
        // Permitir que el admin defina la imagen QR a mostrar (config file o env)
        const { loadPaymentSettings } = await import('./paymentConfigController');
        const settings = await loadPaymentSettings();
        const adminQrPath = settings.qrImagePath || process.env.ADMIN_QR_IMAGE_PATH || process.env.QR_IMAGE_PATH;
        const fallbackPath = path.join(__dirname, '../../uploads/qr/default.png');
        const qrPath = (adminQrPath && fs.existsSync(adminQrPath)) ? adminQrPath
          : (fs.existsSync(fallbackPath) ? fallbackPath : null);

        if (qrPath) {
          const buffer = await fs.promises.readFile(qrPath);
          const base64 = buffer.toString('base64');
          return `data:image/png;base64,${base64}`;
        }
        // Si no hay imagen definida por el admin, generar un QR dinámico con el código
        return await QRCode.toDataURL(codigoQR);
      };

      // Verificar si ya existe un QR activo para este pago
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
        // Generar imagen QR para el código existente
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

      // Generar código único
      const codigo = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Calcular fecha de expiración
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + tiempoExpiracion);

      // Crear el QR en la base de datos
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

      // Generar imagen QR
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

    } catch (error) {
      console.error('Error al generar QR:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // GET /api/qr/:codigo/validar
  validarQR: async (req: Request, res: Response) => {
    try {
      const { codigo } = req.params;

      // Buscar el QR por código
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

      // Verificar si el QR ha expirado
      const ahora = new Date();
      const haExpirado = qr.expiresAt < ahora;

      if (haExpirado && qr.estado === 'ACTIVO') {
        // Marcar como expirado
        await prisma.qR.update({
          where: { id: qr.id },
          data: { estado: 'EXPIRADO' }
        });
      }

      // Determinar validez
      const esValido = qr.estado === 'ACTIVO' && !haExpirado;
      const tiempoRestante = haExpirado ? 0 : Math.floor((qr.expiresAt.getTime() - ahora.getTime()) / 1000);

      // Información de validación
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

    } catch (error) {
      console.error('Error al validar QR:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // GET /api/qr/:id/estado
  consultarEstadoQR: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const clienteId = (req.user as any)?.id;

      if (!clienteId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Buscar el QR y verificar que pertenece al cliente
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

      // Calcular información de estado
      const ahora = new Date();
      const haExpirado = qr.expiresAt < ahora;
      const tiempoRestante = haExpirado ? 0 : Math.floor((qr.expiresAt.getTime() - ahora.getTime()) / 1000);
      const tiempoTranscurrido = Math.floor((ahora.getTime() - qr.createdAt.getTime()) / 1000);

      // Verificar si el pago está completado y el QR aún está activo
      let estadoQRActualizado = qr.estado;
      if (qr.pago.estado === 'COMPLETADO' && qr.estado === 'ACTIVO') {
        // Marcar el QR como usado si el pago está completado
        await prisma.qR.update({
          where: { id: qr.id },
          data: { estado: 'USADO' }
        });
        estadoQRActualizado = 'USADO';
      }
      // Actualizar estado si ha expirado
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
        porcentajeVida: Math.max(0, Math.min(100, 
          (tiempoRestante / (3 * 60)) * 100 // Asumiendo 3 minutos de vida
        ))
      };

      return res.json({
        success: true,
        data: estadoDetallado
      });

    } catch (error) {
      console.error('Error al consultar estado del QR:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // POST /api/qr/:codigo/usar - Marcar QR como usado (para procesamiento de pago)
  usarQR: async (req: Request, res: Response) => {
    try {
      const { codigo } = req.params;

      // Buscar y validar el QR
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

      // Verificar validez
      const ahora = new Date();
      const haExpirado = qr.expiresAt < ahora;

      if (haExpirado || qr.estado !== 'ACTIVO') {
        return res.status(400).json({
          success: false,
          message: 'QR no válido o expirado'
        });
      }

      // Marcar QR como usado y actualizar pago
      const [qrActualizado, pagoActualizado] = await prisma.$transaction([
        prisma.qR.update({
          where: { id: qr.id },
          data: { estado: 'USADO' }
        }),
        prisma.pago.update({
          where: { id: qr.pagoId },
          data: { 
            estado: 'COMPLETADO'
            // Nota: fechaProcesamiento no existe en el schema
          }
        })
      ]);

      // IMPORTANTE: Procesar automáticamente el pago completado
      // Importar el pagoController para usar su método de procesamiento
      const { pagoController } = await import('./pagoController');
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

    } catch (error) {
      console.error('Error al usar QR:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
};
