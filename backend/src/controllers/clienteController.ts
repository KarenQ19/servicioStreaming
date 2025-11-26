import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Obtener perfil del cliente
export const obtenerPerfil = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req.user as any)?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        telefono: true,
        createdAt: true
      }
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    return res.json(cliente);
  } catch (error) {
    console.error('Error al obtener perfil del cliente:', error);
    return res.status(500).json({ error: 'Error al obtener perfil del cliente' });
  }
};

// Obtener métricas del cliente para el dashboard
export const obtenerMetricasCliente = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req.user as any)?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Obtener suscripciones activas
    const suscripciones = await prisma.suscripcion.findMany({
      where: {
        clienteId: userId,
        estado: 'ACTIVA'
      },
      include: {
        servicio: true,
        pagos: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        }
      }
    });

    // Calcular gasto mensual (suma de precios de servicios activos)
    const gastoMensual = suscripciones.reduce((total, sub) => total + sub.servicio.precio, 0);

    // Calcular gasto total (suma de todos los pagos realizados)
    const pagos = await prisma.pago.findMany({
      where: {
        clienteId: userId
      }
    });
    const gastoTotal = pagos.reduce((total, pago) => total + pago.monto, 0);

    // Obtener servicios recomendados (servicios que el usuario no tiene)
    const serviciosRecomendados = await prisma.servicio.findMany({
      where: {
        NOT: {
          suscripciones: {
            some: {
              clienteId: userId,
              estado: 'ACTIVA'
            }
          }
        },
        disponible: true
      },
      take: 5
    });

    // Obtener últimos pagos
    const ultimosPagos = await prisma.pago.findMany({
      where: {
        clienteId: userId
      },
      include: {
        suscripcion: {
          include: {
            servicio: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    return res.json({
      suscripcionesActivas: suscripciones.length,
      gastoMensual,
      gastoTotal,
      ultimosPagos,
      serviciosRecomendados
    });
  } catch (error) {
    console.error('Error al obtener métricas del cliente:', error);
    return res.status(500).json({ error: 'Error al obtener métricas del cliente' });
  }
};