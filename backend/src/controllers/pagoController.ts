import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { asignarCredencial } from './credencialesController';

const prisma = new PrismaClient();

export const pagoController = {
  // POST /api/pagos/procesar
  procesar: async (req: Request, res: Response) => {
    try {
      const { monto, metodoPagoId, carritoId, suscripcionId, descripcion } = req.body;
      const clienteId = (req.user as any)?.id;

      if (!clienteId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Validar método de pago
      const metodoPago = await prisma.metodoPago.findUnique({
        where: { id: metodoPagoId }
      });

      if (!metodoPago) {
        return res.status(404).json({
          success: false,
          message: 'Método de pago no encontrado'
        });
      }

      // Crear el pago
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

      // Simular procesamiento del pago (solo para métodos instantáneos)
      const procesado = Math.random() > 0.1; // 90% de éxito para tarjetas, etc.
      
      // Mantener PENDIENTE para QR y TRANSFERENCIA (requiere comprobante/OCR)
      const estadoFinal = ['QR', 'TRANSFERENCIA'].includes(metodoPago.tipo)
        ? 'PENDIENTE'
        : (procesado ? 'COMPLETADO' : 'FALLIDO');
      
      const pagoActualizado = await prisma.pago.update({
        where: { id: pago.id },
        data: {
          estado: estadoFinal
          // Nota: fechaProcesamiento no existe en el schema
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

      // Si es método QR, generar el código QR
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

          const customQrPath = process.env.QR_IMAGE_PATH || path.join(__dirname, '../../uploads/qr/default.png');
          let imagenBase64: string | null = null;
          if (customQrPath && fs.existsSync(customQrPath)) {
            const buffer = await fs.promises.readFile(customQrPath);
            imagenBase64 = buffer.toString('base64');
          } else {
            const generado = await QRCode.toDataURL(codigo);
            imagenBase64 = generado.split(',')[1];
          }

          qrGenerado = {
            ...qr,
            imagenBase64
          };
        } catch (qrError) {
          console.error('Error al generar QR:', qrError);
        }
      }

      
// Preparar respuesta
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

    } catch (error) {
      console.error('Error al procesar pago:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // GET /api/pagos/:id/validar
  validar: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const clienteId = (req.user as any)?.id;

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

      // Validar el pago
      const esValido = pago.estado === 'COMPLETADO';

      return res.json({
        success: true,
        data: {
          pago,
          esValido,
          mensaje: esValido ? 'Pago válido' : 'Pago no válido o no completado'
        }
      });

    } catch (error) {
      console.error('Error al validar pago:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // POST /api/pagos/:id/reembolso
  reembolsar: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { motivo } = req.body;
      const clienteId = (req.user as any)?.id;

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

      // Verificar si ya fue reembolsado
      if (pago.estado === 'REEMBOLSADO') {
        return res.status(400).json({
          success: false,
          message: 'Este pago ya fue reembolsado'
        });
      }

      // Procesar reembolso
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

    } catch (error) {
      console.error('Error al procesar reembolso:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // GET /api/pagos/:id/estado
  consultarEstado: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const clienteId = (req.user as any)?.id;

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

      // Calcular información adicional del estado
      const estadoDetallado = {
        ...pago,
        tiempoTranscurrido: pago.createdAt ? 
          Date.now() - pago.createdAt.getTime() : 0,
        esPendiente: pago.estado === 'PENDIENTE',
        esCompletado: pago.estado === 'COMPLETADO',
        esFallido: pago.estado === 'FALLIDO',
        esReembolsado: pago.estado === 'REEMBOLSADO',
        puedeReembolsarse: pago.estado === 'COMPLETADO',
        itemsCount: pago.carrito?.items?.reduce((total: number, item: any) => total + item.cantidad, 0) || 0
      };

      return res.json({
        success: true,
        data: estadoDetallado
      });

    } catch (error) {
      console.error('Error al consultar estado del pago:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // Función auxiliar para procesar un pago completado
  procesarPagoCompletado: async (pagoId: string) => {
    try {
      // Obtener el pago con toda la información necesaria
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
      fechaFin.setMonth(fechaFin.getMonth() + 1); // Suscripción por 1 mes

      // Crear suscripciones para cada item del carrito
      for (const item of pago.carrito.items) {
        // Verificar si ya existe una suscripción activa para este servicio
        const suscripcionExistente = await prisma.suscripcion.findFirst({
          where: {
            clienteId: pago.clienteId,
            servicioId: item.servicioId,
            estado: 'ACTIVA'
          }
        });

        if (!suscripcionExistente) {
          // Crear nueva suscripción
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

          // Asignar credenciales
          const credencial = await asignarCredencial(item.servicioId, pago.clienteId, suscripcion.id);
          credencialesAsignadas.push(credencial);
        }
      }

      // Desactivar el carrito
      await prisma.carrito.update({
        where: { id: pago.carrito.id },
        data: { activo: false }
      });

      return {
        suscripcionesCreadas,
        credencialesAsignadas,
        carritoDesactivado: true
      };

    } catch (error) {
      console.error('Error al procesar pago completado:', error);
      throw error;
    }
  },

  // POST /api/pagos/:id/completar - Marcar pago como completado y procesar automáticamente
  completar: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
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

      // Marcar el pago como completado
      const pagoActualizado = await prisma.pago.update({
        where: { id },
        data: { estado: 'COMPLETADO' }
      });

      // Procesar automáticamente el pago completado
      const resultado = await pagoController.procesarPagoCompletado(id);

      return res.json({
        success: true,
        data: {
          pago: pagoActualizado,
          procesamiento: resultado
        },
        message: 'Pago completado y procesado exitosamente'
      });

    } catch (error) {
      console.error('Error al completar pago:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // POST /api/pagos/procesar-completados - Procesar todos los pagos completados que no han sido procesados
  procesarCompletados: async (req: Request, res: Response) => {
    try {
      const clienteId = (req.user as any)?.id;

      if (!clienteId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Buscar pagos completados que tienen carritos activos (no procesados)
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

      // Procesar cada pago
      for (const pago of pagosNoProcessados) {
        try {
          const resultado = await pagoController.procesarPagoCompletado(pago.id);
          resultados.push({
            pagoId: pago.id,
            monto: pago.monto,
            estado: 'procesado',
            suscripcionesCreadas: resultado.suscripcionesCreadas.length,
            credencialesAsignadas: resultado.credencialesAsignadas.length
          });
          procesadosExitosos++;
        } catch (error) {
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

    } catch (error) {
      console.error('Error al procesar pagos completados:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
};
