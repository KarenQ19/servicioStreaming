import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Obtener carrito activo del cliente
export const obtenerCarrito = async (req: Request, res: Response): Promise<void> => {
  try {
    const clienteId = (req.user as any)?.id;

    if (!clienteId) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

    // Buscar carrito activo o crear uno nuevo
    let carrito = await prisma.carrito.findFirst({
      where: {
        clienteId,
        activo: true
      },
      include: {
        items: {
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
            }
          }
        }
      }
    });

    if (!carrito) {
      carrito = await prisma.carrito.create({
        data: {
          clienteId,
          activo: true
        },
        include: {
          items: {
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
              }
            }
          }
        }
      });
    }

    // Calcular totales
    const subtotal = carrito.items.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.precio.toString()) * item.cantidad);
    }, 0);

    const total = subtotal; // Aquí se pueden agregar impuestos o descuentos

    res.json({
      success: true,
      data: {
        carrito,
        resumen: {
          cantidadItems: carrito.items.length,
          subtotal: subtotal.toFixed(2),
          total: total.toFixed(2)
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Agregar item al carrito
export const agregarItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const clienteId = (req.user as any)?.id;
    const { servicioId, cantidad = 1 } = req.body;

    if (!clienteId) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

    // Validar que el servicio existe y está disponible
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

    // Verificar si el cliente ya tiene una suscripción activa a este servicio
    const suscripcionExistente = await prisma.suscripcion.findFirst({
      where: {
        clienteId,
        servicioId,
        estado: 'ACTIVA'
      }
    });

    // En lugar de bloquear, permitimos agregar al carrito pero con una advertencia
    let advertencia = null;
    if (suscripcionExistente) {
      advertencia = 'Ya tienes una suscripción activa a este servicio';
    }

    // Obtener o crear carrito activo
    let carrito = await prisma.carrito.findFirst({
      where: {
        clienteId,
        activo: true
      }
    });

    if (!carrito) {
      carrito = await prisma.carrito.create({
        data: {
          clienteId,
          activo: true
        }
      });
    }

    // Verificar si el item ya existe en el carrito
    const itemExistente = await prisma.carritoItem.findFirst({
      where: {
        carritoId: carrito.id,
        servicioId
      }
    });

    let carritoItem;

    if (itemExistente) {
      // Actualizar cantidad
      carritoItem = await prisma.carritoItem.update({
        where: { id: itemExistente.id },
        data: {
          cantidad: itemExistente.cantidad + cantidad,
          precio: servicio.precio
        },
        include: {
          servicio: {
            select: {
              id: true,
              nombre: true,
              descripcion: true,
              precio: true,
              categoria: true,
              disponible: true
            }
          }
        }
      });
    } else {
      // Crear nuevo item
      carritoItem = await prisma.carritoItem.create({
        data: {
          carritoId: carrito.id,
          servicioId,
          cantidad,
          precio: servicio.precio
        },
        include: {
          servicio: {
            select: {
              id: true,
              nombre: true,
              descripcion: true,
              precio: true,
              categoria: true,
              disponible: true
            }
          }
        }
      });
    }

    res.json({
      success: true,
      message: 'Item agregado al carrito exitosamente',
      data: carritoItem,
      advertencia: advertencia
    });
  } catch (error) {
    console.error('Error al agregar item al carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar cantidad de item
export const actualizarItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const clienteId = (req.user as any)?.id;
    const { itemId } = req.params;
    const { cantidad } = req.body;

    if (!clienteId) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

    if (cantidad <= 0) {
      res.status(400).json({
        success: false,
        message: 'La cantidad debe ser mayor a 0'
      });
      return;
    }

    // Verificar que el item pertenece al cliente
    const item = await prisma.carritoItem.findFirst({
      where: {
        id: itemId,
        carrito: {
          clienteId,
          activo: true
        }
      },
      include: {
        servicio: true
      }
    });

    if (!item) {
      res.status(404).json({
        success: false,
        message: 'Item no encontrado en el carrito'
      });
      return;
    }

    const itemActualizado = await prisma.carritoItem.update({
      where: { id: itemId },
      data: {
        cantidad,
        precio: item.servicio.precio
      },
      include: {
        servicio: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            precio: true,
            categoria: true,
            disponible: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Item actualizado exitosamente',
      data: itemActualizado
    });
  } catch (error) {
    console.error('Error al actualizar item:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Eliminar item del carrito
export const eliminarItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const clienteId = (req.user as any)?.id;
    const { itemId } = req.params;

    if (!clienteId) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

    // Verificar que el item pertenece al cliente
    const item = await prisma.carritoItem.findFirst({
      where: {
        id: itemId,
        carrito: {
          clienteId,
          activo: true
        }
      }
    });

    if (!item) {
      res.status(404).json({
        success: false,
        message: 'Item no encontrado en el carrito'
      });
      return;
    }

    await prisma.carritoItem.delete({
      where: { id: itemId }
    });

    res.json({
      success: true,
      message: 'Item eliminado del carrito exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar item:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Vaciar carrito
export const vaciarCarrito = async (req: Request, res: Response): Promise<void> => {
  try {
    const clienteId = (req.user as any)?.id;

    if (!clienteId) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

    const carrito = await prisma.carrito.findFirst({
      where: {
        clienteId,
        activo: true
      }
    });

    if (!carrito) {
      res.status(404).json({
        success: false,
        message: 'Carrito no encontrado'
      });
      return;
    }

    await prisma.carritoItem.deleteMany({
      where: {
        carritoId: carrito.id
      }
    });

    res.json({
      success: true,
      message: 'Carrito vaciado exitosamente'
    });
  } catch (error) {
    console.error('Error al vaciar carrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};