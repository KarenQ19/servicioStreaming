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

    // Calcular gasto a partir de pagos (mensual = pagos del mes actual, total = pagos únicos)
    const pagosCompletados = await prisma.pago.findMany({
      where: {
        clienteId: userId,
        estado: 'COMPLETADO'
      },
      select: { id: true, monto: true, suscripcionId: true, carritoId: true, createdAt: true }
    });

    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();

    const pagosMesActual = pagosCompletados.filter(p => {
      const fecha = new Date(p.createdAt);
      return fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual;
    });

    // Dedupe por suscripción/carrito (último pago) para evitar dobles conteos
    const dedupePorReferencia = (pagos: typeof pagosCompletados) => {
      const mapPagos = new Map<string, typeof pagosCompletados[number]>();
      pagos
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .forEach(p => {
          const key = p.suscripcionId || p.carritoId || `single-${p.id}`;
          if (!mapPagos.has(key)) {
            mapPagos.set(key, p);
          }
        });
      return Array.from(mapPagos.values());
    };

    const pagosUnicos = dedupePorReferencia(pagosCompletados);
    const pagosMesUnicos = dedupePorReferencia(pagosMesActual);

    const gastoTotal = pagosUnicos.reduce((total, pago) => total + Number(pago.monto || 0), 0);
    const gastoMensual = pagosMesUnicos.reduce((total, pago) => total + Number(pago.monto || 0), 0);

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
      gastoMensual: Math.round(gastoMensual),
      gastoTotal: Math.round(gastoTotal),
      ultimosPagos,
      serviciosRecomendados,
      ahorroPotencial: 0
    });
  } catch (error) {
    console.error('Error al obtener métricas del cliente:', error);
    return res.status(500).json({ error: 'Error al obtener métricas del cliente' });
  }
};
