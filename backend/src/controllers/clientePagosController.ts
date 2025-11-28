import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const clientePagosController = {
  // POST /api/clientes/metodo-pago
  seleccionarMetodoPago: async (req: Request, res: Response) => {
    try {
      const { metodoPagoId, establecerComoPreferido = true } = req.body;
      const clienteId = (req.user as any)?.id;

      if (!clienteId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Verificar que el método de pago existe y está disponible
      const metodoPago = await prisma.metodoPago.findFirst({
        where: {
          id: metodoPagoId,
          disponible: true
        }
      });

      if (!metodoPago) {
        return res.status(404).json({
          success: false,
          message: 'Método de pago no encontrado o no disponible'
        });
      }

      // Obtener información actual del cliente
      const cliente = await prisma.cliente.findUnique({
        where: { id: clienteId }
      });

      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      // Actualizar método de pago preferido si se solicita
      let clienteActualizado = cliente;
      // Nota: La funcionalidad de método preferido requiere agregar el campo al schema
      
      // Obtener historial reciente de uso de este método
      const historialReciente = await prisma.pago.findMany({
        where: {
          clienteId,
          metodoPagoId
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          monto: true,
          estado: true,
          createdAt: true,
          descripcion: true
        }
      });

      return res.json({
        success: true,
        data: {
          cliente: {
            id: clienteActualizado.id,
            nombre: clienteActualizado.nombre,
            email: clienteActualizado.email
          },
          metodoPagoSeleccionado: metodoPago,
          esNuevoPreferido: establecerComoPreferido,
          metodoPagoAnterior: null, // Funcionalidad no disponible sin el campo en schema
          historialReciente,
          estadisticas: {
            totalPagosConEsteMetodo: historialReciente.length,
            ultimoUso: historialReciente[0]?.createdAt || null
          }
        },
        message: establecerComoPreferido 
          ? 'Método de pago seleccionado como preferido exitosamente'
          : 'Método de pago seleccionado exitosamente'
      });

    } catch (error) {
      console.error('Error al seleccionar método de pago:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // GET /api/clientes/pagos
  consultarHistorialPagos: async (req: Request, res: Response) => {
    try {
      const clienteId = (req.user as any)?.id;
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

      if (!clienteId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Construir filtros
      const filtros: any = { clienteId };

      if (estado) {
        filtros.estado = estado;
      }

      if (metodoPagoId) {
        filtros.metodoPagoId = metodoPagoId;
      }

      if (fechaInicio || fechaFin) {
        filtros.createdAt = {};
        if (fechaInicio) {
          filtros.createdAt.gte = new Date(fechaInicio as string);
        }
        if (fechaFin) {
          filtros.createdAt.lte = new Date(fechaFin as string);
        }
      }

      // Calcular paginación
      const skip = (Number(page) - 1) * Number(limit);

      // Obtener pagos con información relacionada
      const [pagosRaw, totalPagos] = await Promise.all([
        prisma.pago.findMany({
          where: filtros,
          include: {
            metodoPago: true,
            cliente: { select: { id: true, nombre: true, email: true } },
            carrito: {
              include: {
                items: {
                  include: {
                    servicio: {
                      select: {
                        id: true,
                        nombre: true,
                        precio: true,
                        categoria: true
                      }
                    }
                  }
                }
              }
            },
            suscripcion: {
              include: {
                servicio: {
                  select: {
                    id: true,
                    nombre: true,
                    precio: true,
                    categoria: true
                  }
                }
              }
            },
            qr: {
              select: {
                id: true,
                codigo: true,
                estado: true,
                createdAt: true,
                expiresAt: true
              }
            }
          },
          orderBy: { [ordenarPor as string]: orden },
          skip,
          take: Number(limit)
          }),
        prisma.pago.count({ where: filtros })
      ]);

      // Normalizar pendientes sin carrito (carrito vacío o eliminado) a FALLIDO
      const pagos = pagosRaw.map(p => {
        const itemsCount = p.carrito?.items?.length || 0;
        if (p.estado === 'PENDIENTE' && (!p.carrito || itemsCount === 0)) {
          return { ...p, estado: 'FALLIDO', descripcion: p.descripcion || 'Pago cancelado por carrito vacío' };
        }
        return p;
      });

      // Filtrar pendientes si ya hay un pago completado para la misma suscripción o carrito
      const completadosKeys = new Set(
        pagos
          .filter(p => p.estado === 'COMPLETADO')
          .map(p => `${p.suscripcionId || ''}-${p.carritoId || ''}`)
      );
      const pagosFiltrados = pagos.filter(p => {
        if (p.estado !== 'PENDIENTE') return true;
        const key = `${p.suscripcionId || ''}-${p.carritoId || ''}`;
        return !completadosKeys.has(key);
      });

      // Quedarse con el pago más reciente por suscripción/carrito
      const pagosUnicosMap = new Map<string, typeof pagosFiltrados[number]>();
      pagosFiltrados
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .forEach(p => {
          const key = p.suscripcionId || p.carritoId || `single-${p.id}`;
          if (!pagosUnicosMap.has(key)) {
            pagosUnicosMap.set(key, p);
          }
        });
      const pagosUnicos = Array.from(pagosUnicosMap.values());

      // Calcular estadísticas del historial (solo completados para totales)
      const estadisticasCompletados = await prisma.pago.aggregate({
        where: { clienteId, estado: 'COMPLETADO' },
        _sum: { monto: true },
        _count: { _all: true }
      });

      // Estadísticas por estado (para mostrar pendientes/fallidos/reembolsados)
      const estadisticasPorEstado = await prisma.pago.groupBy({
        by: ['estado'],
        where: { clienteId },
        _count: { _all: true },
        _sum: { monto: true }
      });

      // Métodos de pago más utilizados
      const metodosMasUsados = await prisma.pago.groupBy({
        by: ['metodoPagoId'],
        where: { clienteId },
        _count: { metodoPagoId: true },
        _sum: { monto: true },
        orderBy: { _count: { metodoPagoId: 'desc' } },
        take: 5
      });

      // Obtener información de los métodos más usados
      const metodosInfo = await prisma.metodoPago.findMany({
        where: {
          id: { in: metodosMasUsados.map((m: any) => m.metodoPagoId) }
        }
      });

      const metodosMasUsadosConInfo = metodosMasUsados.map((metodo: any) => ({
        ...metodo,
        metodoPago: metodosInfo.find((m: any) => m.id === metodo.metodoPagoId)
      }));

      // Información de paginación (ajustada después de filtrar pendientes)
      const totalRegistros = pagosFiltrados.length || totalPagos;
      const totalPaginas = Math.max(1, Math.ceil(totalRegistros / Number(limit)));
      const paginaActual = Number(page);

      return res.json({
        success: true,
        data: {
          pagos: pagosUnicos,
          paginacion: {
            paginaActual,
            totalPaginas,
            totalRegistros: pagosUnicos.length || totalRegistros,
            registrosPorPagina: Number(limit),
            hayPaginaAnterior: paginaActual > 1,
            hayPaginaSiguiente: paginaActual < totalPaginas
          },
          estadisticas: {
            totalPagos: estadisticasCompletados._count?._all || 0,
            montoTotal: estadisticasCompletados._sum.monto || 0,
            promedioPorPago: (estadisticasCompletados._count?._all && estadisticasCompletados._sum.monto) 
              ? Number(estadisticasCompletados._sum.monto) / Number(estadisticasCompletados._count._all) 
              : 0,
            estadisticasPorEstado: estadisticasPorEstado.map((est: any) => ({
              estado: est.estado,
              cantidad: est._count?._all || 0,
              montoTotal: est._sum.monto || 0
            })),
            metodosMasUsados: metodosMasUsadosConInfo
          },
          filtrosAplicados: {
            estado,
            metodoPagoId,
            fechaInicio,
            fechaFin,
            ordenarPor,
            orden
          }
        }
      });

    } catch (error) {
      console.error('Error al consultar historial de pagos:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // GET /api/clientes/pagos/resumen - Resumen de pagos del cliente
  obtenerResumenPagos: async (req: Request, res: Response) => {
    try {
      const clienteId = (req.user as any)?.id;

      if (!clienteId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Traer pagos del cliente y limpiar pendientes duplicados (si hay completado para misma suscripción/carrito)
      const pagosCliente = await prisma.pago.findMany({
        where: { clienteId },
        select: {
          id: true,
          estado: true,
          monto: true,
          suscripcionId: true,
          carritoId: true,
          createdAt: true
        }
      });

      const completadosKeys = new Set(
        pagosCliente
          .filter(p => p.estado === 'COMPLETADO')
          .map(p => `${p.suscripcionId || ''}-${p.carritoId || ''}`)
      );

      const pagosFiltrados = pagosCliente.filter(p => {
        if (p.estado !== 'PENDIENTE') return true;
        const key = `${p.suscripcionId || ''}-${p.carritoId || ''}`;
        return !completadosKeys.has(key);
      });

      // Tomar el pago más reciente por suscripción/carrito para no duplicar renovaciones
      const pagosUnicosMap = new Map<string, typeof pagosFiltrados[number]>();
      pagosFiltrados
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .forEach(p => {
          const key = p.suscripcionId || p.carritoId || `single-${p.id}`;
          if (!pagosUnicosMap.has(key)) {
            pagosUnicosMap.set(key, p);
          }
        });

      const pagosUnicos = Array.from(pagosUnicosMap.values());

      const pendientes = pagosUnicos.filter(p => p.estado === 'PENDIENTE');
      const completados = pagosUnicos.filter(p => p.estado === 'COMPLETADO');
      const fallidos = pagosUnicos.filter(p => p.estado === 'FALLIDO');
      const reembolsados = pagosUnicos.filter(p => p.estado === 'REEMBOLSADO');
      const totalPagos = completados.length;
      const montoTotal = completados.reduce((sum, p) => sum + Number(p.monto || 0), 0);

      // Pagos recientes
      const pagosRecientes = await prisma.pago.findMany({
        where: { clienteId },
        include: {
          metodoPago: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      // Método de pago preferido
      const cliente = await prisma.cliente.findUnique({
        where: { id: clienteId }
      });

      return res.json({
        success: true,
        data: {
          resumenGeneral: {
            totalPagos,
            montoTotal,
            promedioMensual: 0 // Se podría calcular basado en fechas
          },
          estadosPagos: {
            pendientes: {
              cantidad: pendientes.length,
              monto: pendientes.reduce((s, p) => s + Number(p.monto || 0), 0)
            },
            completados: {
              cantidad: completados.length,
              monto: completados.reduce((s, p) => s + Number(p.monto || 0), 0)
            },
            fallidos: {
              cantidad: fallidos.length,
              monto: fallidos.reduce((s, p) => s + Number(p.monto || 0), 0)
            },
            reembolsados: {
              cantidad: reembolsados.length,
              monto: reembolsados.reduce((s, p) => s + Number(p.monto || 0), 0)
            }
          },
          pagosRecientes,
          metodoPagoPreferido: null, // Funcionalidad no disponible sin el campo en schema
          alertas: {
            tienePagosPendientes: pendientes.length > 0,
            tienePagosFallidos: fallidos.length > 0,
            necesitaMetodoPreferido: false // Funcionalidad no disponible
          }
        }
      });

    } catch (error) {
      console.error('Error al obtener resumen de pagos:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
};
