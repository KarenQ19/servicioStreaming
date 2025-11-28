import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asignarCredencial } from './credencialesController';

const prisma = new PrismaClient();

// Obtener suscripciones del cliente
export const obtenerSuscripciones = async (req: Request, res: Response): Promise<void> => {
  try {
    const clienteId = (req.user as any)?.id;
    const { estado, page = '1', limit = '10' } = req.query;

    if (!clienteId) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

    const take = Math.min(parseInt(limit as string), 50);
    const skip = (parseInt(page as string) - 1) * take;

    // Construir filtros
    const where: any = {
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
          currentPage: parseInt(page as string),
          totalPages,
          totalItems: total,
          itemsPerPage: take,
          hasNextPage: parseInt(page as string) < totalPages,
          hasPrevPage: parseInt(page as string) > 1
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener suscripciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Crear suscripción desde carrito
export const crearSuscripcionDesdeCarrito = async (req: Request, res: Response): Promise<void> => {
  try {
    const clienteId = (req.user as any)?.id;
    const { metodoPagoId } = req.body;

    if (!clienteId) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

    // Buscar el carrito activo del cliente
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

    // Verificar suscripciones duplicadas y filtrar
    const itemsValidos = [];
    const duplicados: string[] = [];
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

// Calcular total solo con los items vAlidos
    const total = itemsParaProcesar.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.precio.toString()) * item.cantidad);
    }, 0);

    // Si el total es 0, no procesar
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

// Crear UN SOLO pago para todo el carrito como PENDIENTE primero
    const pago = await prisma.pago.create({
      data: {
        clienteId,
        carritoId: carrito.id,
        metodoPagoId,
        monto: total,
        estado: 'PENDIENTE', // Crear como pendiente primero
        referencia: `PAY-${Date.now()}`,
        descripcion: `Pago de suscripciones desde carrito - ${carrito.items.length} servicio(s)`
      }
    });

    // Marcar el pago como completado y procesar automáticamente
    const pagoCompletado = await prisma.pago.update({
      where: { id: pago.id },
      data: { estado: 'COMPLETADO' }
    });

    // Importar y usar la función de procesamiento automático
    const { pagoController } = await import('./pagoController');
    
    let resultado;
    try {
      resultado = await pagoController.procesarPagoCompletado(pagoCompletado.id);
    } catch (processingError) {
      console.error('Error en procesamiento automático:', processingError);
      // Si falla el procesamiento automático, revertir el pago a pendiente
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
  } catch (error) {
    console.error('Error al crear suscripciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Crear suscripción individual
export const crearSuscripcion = async (req: Request, res: Response): Promise<void> => {
  try {
    const clienteId = (req.user as any)?.id;
    const { servicioId, metodoPagoId } = req.body;

    if (!clienteId) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

    // Verificar que el servicio existe y está disponible
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

    // Verificar que no hay suscripción activa
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

    // Crear pago
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

    // Crear suscripción
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

    // Crear credenciales usando el nuevo sistema
    let credenciales;
    try {
      credenciales = await asignarCredencial(servicioId, clienteId, suscripcion.id);
    } catch (credError) {
      // Si no hay credenciales disponibles, crear credenciales genéricas como fallback
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

    // Asociar pago a suscripción
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
  } catch (error) {
    console.error('Error al crear suscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Cancelar suscripción
export const cancelarSuscripcion = async (req: Request, res: Response): Promise<void> => {
  try {
    const clienteId = (req.user as any)?.id;
    const { suscripcionId } = req.params;

    if (!clienteId) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

    // Verificar que la suscripción pertenece al cliente
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

    // Cancelar suscripción
    const suscripcionActualizada = await prisma.suscripcion.update({
      where: { id: suscripcionId },
      data: {
        estado: 'CANCELADA',
        fechaFin: new Date() // Termina inmediatamente
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

    // Desactivar credenciales
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
  } catch (error) {
    console.error('Error al cancelar suscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Pausar suscripción
export const pausarSuscripcion = async (req: Request, res: Response): Promise<void> => {
  try {
    const clienteId = (req.user as any)?.id;
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
  } catch (error) {
    console.error('Error al pausar suscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Reactivar suscripción
export const reactivarSuscripcion = async (req: Request, res: Response): Promise<void> => {
  try {
    const clienteId = (req.user as any)?.id;
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
  } catch (error) {
    console.error('Error al reactivar suscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener detalles de suscripción
export const obtenerDetalleSuscripcion = async (req: Request, res: Response): Promise<void> => {
  try {
    const clienteId = (req.user as any)?.id;
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

    // Calcular días restantes
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
  } catch (error) {
    console.error('Error al obtener detalle de suscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};
