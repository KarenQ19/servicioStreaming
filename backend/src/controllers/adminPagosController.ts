import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const adminPagosController = {
  // GET /api/admin/pagos - Historial completo de pagos
  listarPagos: async (req: Request, res: Response) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        estado, 
        metodoPagoId, 
        fechaInicio, 
        fechaFin,
        ordenarPor = 'createdAt',
        orden = 'desc'
      } = req.query;

      const filtros: any = {};
      if (estado) filtros.estado = estado;
      if (metodoPagoId) filtros.metodoPagoId = metodoPagoId;
      if (fechaInicio || fechaFin) {
        filtros.createdAt = {};
        if (fechaInicio) filtros.createdAt.gte = new Date(fechaInicio as string);
        if (fechaFin) filtros.createdAt.lte = new Date(fechaFin as string);
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [pagosRaw, totalPagos] = await Promise.all([
        prisma.pago.findMany({
          where: filtros,
          include: {
            cliente: { select: { id: true, nombre: true, email: true } },
            metodoPago: true,
            suscripcion: {
              include: {
                servicio: { select: { id: true, nombre: true, precio: true, categoria: true } }
              }
            },
            carrito: {
              include: {
                items: {
                  include: {
                    servicio: { select: { id: true, nombre: true, precio: true, categoria: true } }
                  }
                }
              }
            }
          },
          orderBy: { [ordenarPor as string]: orden },
          skip,
          take: Number(limit)
        }),
        prisma.pago.count({ where: filtros })
      ]);

      const pagos = pagosRaw.map(p => {
        const itemsCount = p.carrito?.items?.length || 0;
        if (p.estado === 'PENDIENTE' && (!p.carrito || itemsCount === 0)) {
          return { ...p, estado: 'FALLIDO', descripcion: p.descripcion || 'Pago cancelado por carrito vacío/eliminado' };
        }
        return p;
      });

      // Estadísticas: totales sólo con COMPLETADO
      const estadisticasCompletados = await prisma.pago.aggregate({
        where: { ...filtros, estado: 'COMPLETADO' },
        _sum: { monto: true },
        _count: { _all: true }
      });

      const estadisticasPorEstado = await prisma.pago.groupBy({
        by: ['estado'],
        where: filtros,
        _count: { _all: true },
        _sum: { monto: true }
      });

      // Filtrar pendientes si ya hay completado para misma suscripción/carrito
      // o, si no hay relación, para el mismo cliente (pago suelto)
      const completadosKeys = new Set(
        pagos
          .filter(p => p.estado === 'COMPLETADO')
          .map(p => {
            const rel = `${p.suscripcionId || ''}-${p.carritoId || ''}`;
            return rel !== '-' ? rel : `cliente-${p.clienteId}`;
          })
      );
      const pagosFiltrados = pagos.filter(p => {
        if (p.estado !== 'PENDIENTE') return true;
        const key = `${p.suscripcionId || ''}-${p.carritoId || ''}`;
        const keyCliente = `cliente-${p.clienteId}`;
        return !completadosKeys.has(key) && !completadosKeys.has(keyCliente);
      });

      const totalRegistros = pagosFiltrados.length || totalPagos;
      const totalPaginas = Math.max(1, Math.ceil(totalRegistros / Number(limit)));
      const paginaActual = Number(page);

      // Recalcular estadísticas locales con filtrado aplicado
      const completadosLocal = pagosFiltrados.filter(p => p.estado === 'COMPLETADO');
      const pendientesLocal = pagosFiltrados.filter(p => p.estado === 'PENDIENTE');
      const fallidosLocal = pagosFiltrados.filter(p => p.estado === 'FALLIDO');
      const reembolsadosLocal = pagosFiltrados.filter(p => p.estado === 'REEMBOLSADO');

      return res.json({
        success: true,
        data: {
          pagos: pagosFiltrados,
          paginacion: {
            paginaActual,
            totalPaginas,
            totalRegistros,
            registrosPorPagina: Number(limit),
            hayPaginaAnterior: paginaActual > 1,
            hayPaginaSiguiente: paginaActual < totalPaginas
          },
          estadisticas: {
            totalPagos: completadosLocal.length || estadisticasCompletados._count?._all || 0,
            montoTotal: completadosLocal.reduce((s, p) => s + Number(p.monto || 0), 0) 
              || estadisticasCompletados._sum?.monto || 0,
            estadisticasPorEstado: [
              { estado: 'COMPLETADO', cantidad: completadosLocal.length, montoTotal: completadosLocal.reduce((s, p) => s + Number(p.monto || 0), 0) },
              { estado: 'PENDIENTE', cantidad: pendientesLocal.length, montoTotal: pendientesLocal.reduce((s, p) => s + Number(p.monto || 0), 0) },
              { estado: 'FALLIDO', cantidad: fallidosLocal.length, montoTotal: fallidosLocal.reduce((s, p) => s + Number(p.monto || 0), 0) },
              { estado: 'REEMBOLSADO', cantidad: reembolsadosLocal.length, montoTotal: reembolsadosLocal.reduce((s, p) => s + Number(p.monto || 0), 0) },
            ]
          }
        }
      });
    } catch (error) {
      console.error('Error al listar pagos admin:', error);
      return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }
};
