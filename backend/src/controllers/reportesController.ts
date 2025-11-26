import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const reportesController = {
  // GET /api/admin/reportes/ventas - Reportes de ventas
  consultarReportesVentas: async (req: Request, res: Response) => {
    try {
      const { 
        fechaInicio, 
        fechaFin, 
        periodo = 'mensual', // diario, semanal, mensual, anual
        servicio,
        cliente 
      } = req.query;

      // Configurar fechas por defecto (último mes)
      const fechaFinDate = fechaFin ? new Date(fechaFin as string) : new Date();
      const fechaInicioDate = fechaInicio 
        ? new Date(fechaInicio as string) 
        : new Date(fechaFinDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Construir filtros base
      const whereBase: any = {
        createdAt: {
          gte: fechaInicioDate,
          lte: fechaFinDate
        },
        estado: 'COMPLETADO'
      };

      if (servicio) {
        whereBase.suscripcion = {
          servicioId: servicio
        };
      }

      if (cliente) {
        whereBase.clienteId = cliente;
      }

      // Obtener datos de ventas
      const [
        ventasTotales,
        ventasPorPeriodo,
        ventasPorServicio,
        ventasPorCliente,
        metodosPopulares,
        estadisticasGenerales
      ] = await Promise.all([
        // Ventas totales en el período
        prisma.pago.aggregate({
          where: whereBase,
          _sum: { monto: true },
          _count: { id: true },
          _avg: { monto: true }
        }),

        // Ventas agrupadas por período
        prisma.pago.groupBy({
          by: ['createdAt'],
          where: whereBase,
          _sum: { monto: true },
          _count: { id: true },
          orderBy: { createdAt: 'asc' }
        }),

        // Ventas por servicio
        prisma.pago.findMany({
          where: whereBase,
          include: {
            suscripcion: {
              include: {
                servicio: {
                  select: {
                    id: true,
                    nombre: true,
                    categoria: true,
                    precio: true
                  }
                }
              }
            }
          }
        }),

        // Top clientes por gasto
        prisma.pago.groupBy({
          by: ['clienteId'],
          where: whereBase,
          _sum: { monto: true },
          _count: { id: true },
          orderBy: { _sum: { monto: 'desc' } },
          take: 10
        }),

        // Métodos de pago más populares
        prisma.pago.groupBy({
          by: ['metodoPagoId'],
          where: whereBase,
          _count: { id: true },
          _sum: { monto: true },
          orderBy: { _count: { id: 'desc' } }
        }),

        // Estadísticas generales del período
        prisma.$transaction([
          // Nuevos clientes en el período
          prisma.cliente.count({
            where: {
              createdAt: {
                gte: fechaInicioDate,
                lte: fechaFinDate
              }
            }
          }),
          // Nuevas suscripciones
          prisma.suscripcion.count({
            where: {
              createdAt: {
                gte: fechaInicioDate,
                lte: fechaFinDate
              }
            }
          }),
          // Suscripciones canceladas
          prisma.suscripcion.count({
            where: {
              estado: 'CANCELADA',
              updatedAt: {
                gte: fechaInicioDate,
                lte: fechaFinDate
              }
            }
          }),
          // Ventas de hoy
          prisma.pago.count({
            where: {
              createdAt: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
                lte: new Date(new Date().setHours(23, 59, 59, 999))
              },
              estado: 'COMPLETADO'
            }
          }),
          // Ventas del mes actual
          prisma.pago.count({
            where: {
              createdAt: {
                gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                lte: new Date()
              },
              estado: 'COMPLETADO'
            }
          }),
          // Ingresos del mes actual
          prisma.pago.aggregate({
            where: {
              createdAt: {
                gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                lte: new Date()
              },
              estado: 'COMPLETADO'
            },
            _sum: { monto: true }
          }),
          // Ingresos del mes anterior para calcular crecimiento
          prisma.pago.aggregate({
            where: {
              createdAt: {
                gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
                lte: new Date(new Date().getFullYear(), new Date().getMonth(), 0)
              },
              estado: 'COMPLETADO'
            },
            _sum: { monto: true }
          })
        ])
      ]);

      // Procesar ventas por servicio
      const ventasServicioMap = new Map();
      ventasPorServicio.forEach(pago => {
        if (pago.suscripcion?.servicio) {
          const servicio = pago.suscripcion.servicio;
          const key = servicio.id;
          
          if (!ventasServicioMap.has(key)) {
            ventasServicioMap.set(key, {
              servicio: servicio,
              totalVentas: 0,
              cantidadVentas: 0,
              ingresos: 0
            });
          }
          
          const data = ventasServicioMap.get(key);
          data.cantidadVentas += 1;
          data.ingresos += Number(pago.monto);
          ventasServicioMap.set(key, data);
        }
      });

      // Obtener información de clientes top
      const clientesIds = ventasPorCliente.map(v => v.clienteId);
      const clientesInfo = await prisma.cliente.findMany({
        where: { id: { in: clientesIds } },
        select: {
          id: true,
          nombre: true,
          email: true
        }
      });

      const topClientes = ventasPorCliente.map(venta => {
        const cliente = clientesInfo.find(c => c.id === venta.clienteId);
        return {
          cliente,
          totalGastado: Number(venta._sum.monto || 0),
          cantidadCompras: venta._count.id
        };
      });

      // Obtener información de métodos de pago
      const metodosIds = metodosPopulares.map(m => m.metodoPagoId).filter(Boolean);
      const metodosInfo = await prisma.metodoPago.findMany({
        where: { id: { in: metodosIds } },
        select: {
          id: true,
          nombre: true,
          tipo: true,
          descripcion: true
        }
      });

      const metodosConInfo = metodosPopulares.map(metodo => {
        const info = metodosInfo.find(m => m.id === metodo.metodoPagoId);
        return {
          metodo: info,
          cantidadUsos: metodo._count.id,
          montoTotal: Number(metodo._sum.monto || 0)
        };
      });

      // Procesar datos por período para gráficos
      const ventasPorPeriodoProcessed = reportesController.procesarVentasPorPeriodo(
        ventasPorPeriodo, 
        periodo as string, 
        fechaInicioDate, 
        fechaFinDate
      );

      // Calcular crecimiento mensual
      const ingresosMesActual = Number(estadisticasGenerales[5]._sum.monto || 0);
      const ingresosMesAnterior = Number(estadisticasGenerales[6]._sum.monto || 0);
      const crecimientoMensual = ingresosMesAnterior > 0 
        ? ((ingresosMesActual - ingresosMesAnterior) / ingresosMesAnterior * 100)
        : 0;

      res.json({
        success: true,
        data: {
          resumen: {
            ingresoTotal: ingresosMesActual,
            cantidadVentas: ventasTotales._count.id,
            ticketPromedio: Number(ventasTotales._avg.monto || 0),
            periodo: {
              inicio: fechaInicioDate.toISOString(),
              fin: fechaFinDate.toISOString()
            }
          },
          ventasPorPeriodo: ventasPorPeriodoProcessed,
          ventasPorServicio: Array.from(ventasServicioMap.values()).map(item => ({
            ...item,
            nombre: item.servicio?.nombre || 'Desconocido',
            cantidad: item.cantidadVentas
          })),
          topClientes: topClientes.map(item => ({
            ...item,
            nombre: item.cliente?.nombre || 'Desconocido',
            total: item.totalGastado
          })),
          metodosPopulares: metodosConInfo,
          estadisticas: {
            nuevosClientes: estadisticasGenerales[0],
            nuevasSuscripciones: estadisticasGenerales[1],
            suscripcionesCanceladas: estadisticasGenerales[2],
            ventasHoy: estadisticasGenerales[3],
            ventasMes: estadisticasGenerales[4],
            ingresosTotales: Number(estadisticasGenerales[5]._sum.monto || 0),
            crecimientoMensual: Math.round(crecimientoMensual * 100) / 100,
            tasaRetencion: estadisticasGenerales[1] > 0 
              ? ((estadisticasGenerales[1] - estadisticasGenerales[2]) / estadisticasGenerales[1] * 100).toFixed(2)
              : 0
          }
        }
      });
    } catch (error) {
      console.error('Error al generar reporte de ventas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // GET /api/admin/reportes/actividad - Reportes de actividad
  consultarReportesActividad: async (req: Request, res: Response) => {
    try {
      const { 
        fechaInicio, 
        fechaFin, 
        tipo = 'general'
      } = req.query;

      // Configurar fechas por defecto (último mes)
      const fechaFinDate = fechaFin ? new Date(fechaFin as string) : new Date();
      const fechaInicioDate = fechaInicio 
        ? new Date(fechaInicio as string) 
        : new Date(fechaFinDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      const whereBase = {
        createdAt: {
          gte: fechaInicioDate,
          lte: fechaFinDate
        }
      };

      // Obtener datos de actividad
      const [
        totalUsuarios,
        usuariosActivos,
        registrosPorDia,
        carritosCreados,
        carritosConvertidos,
        serviciosPopulares,
        serviciosEnCarrito,
        pagosPorEstado,
        pagosPorDia,
        totalServicios,
        suscripcionesActivas,
        pagosCompletados,
        carritosActivos
      ] = await Promise.all([
        // Total de usuarios
        prisma.cliente.count(),
        
        // Usuarios activos (con actividad en el período)
        prisma.cliente.count({
          where: {
            OR: [
              { suscripciones: { some: whereBase } },
              { pagos: { some: whereBase } },
              { carritos: { some: whereBase } }
            ]
          }
        }),
        
        // Registros por día
        prisma.cliente.groupBy({
          by: ['createdAt'],
          where: whereBase,
          _count: { id: true },
          orderBy: { createdAt: 'asc' }
        }),
        
        // Carritos creados en el período
        prisma.carrito.count({ where: whereBase }),
        
        // Carritos convertidos (con pagos completados)
        prisma.carrito.count({
          where: {
            ...whereBase,
            pagos: {
              some: {
                estado: 'COMPLETADO'
              }
            }
          }
        }),
        
        // Servicios más populares (por suscripciones)
        prisma.servicio.findMany({
          include: {
            _count: {
              select: {
                suscripciones: {
                  where: whereBase
                }
              }
            }
          },
          orderBy: {
            suscripciones: {
              _count: 'desc'
            }
          },
          take: 5
        }),
        
        // Servicios más agregados al carrito
        prisma.servicio.findMany({
          include: {
            _count: {
              select: {
                carritoItems: {
                  where: {
                    carrito: whereBase
                  }
                }
              }
            }
          },
          orderBy: {
            carritoItems: {
              _count: 'desc'
            }
          },
          take: 5
        }),
        
        // Pagos por estado
        prisma.pago.groupBy({
          by: ['estado'],
          where: whereBase,
          _count: { id: true },
          _sum: { monto: true }
        }),
        
        // Pagos por día
        prisma.pago.groupBy({
          by: ['createdAt'],
          where: whereBase,
          _count: { id: true },
          _sum: { monto: true },
          orderBy: { createdAt: 'asc' }
        }),
        
        // Estadísticas generales
        prisma.servicio.count(),
        prisma.suscripcion.count({ where: { estado: 'ACTIVA' } }),
        prisma.pago.count({ where: { estado: 'COMPLETADO' } }),
        prisma.carrito.count({ where: { activo: true } })
      ]);

      // Calcular métricas
      const tasaActividad = totalUsuarios > 0 ? ((usuariosActivos / totalUsuarios) * 100).toFixed(2) : '0.00';
      const tasaConversion = carritosCreados > 0 ? ((carritosConvertidos / carritosCreados) * 100).toFixed(2) : '0.00';

      const reporteActividad = {
        resumen: {
          periodo: {
            inicio: fechaInicioDate,
            fin: fechaFinDate
          },
          metricas: {
            usuariosActivos,
            totalUsuarios,
            tasaActividad: `${tasaActividad}%`,
            carritosCreados,
            carritosConvertidos,
            tasaConversion: `${tasaConversion}%`
          }
        },
        usuarios: {
          registrosPorDia: registrosPorDia.map(registro => ({
            createdAt: registro.createdAt,
            _count: { id: registro._count.id }
          })),
          usuariosActivos,
          totalUsuarios
        },
        servicios: {
          masPopulares: serviciosPopulares.map(servicio => ({
            servicio: {
              id: servicio.id,
              nombre: servicio.nombre,
              descripcion: servicio.descripcion,
              precio: servicio.precio,
              categoria: servicio.categoria,
              disponible: servicio.disponible,
              createdAt: servicio.createdAt,
              updatedAt: servicio.updatedAt
            },
            suscripciones: servicio._count.suscripciones
          })),
          masAgregadosCarrito: serviciosEnCarrito.map(servicio => ({
            servicio: {
              id: servicio.id,
              nombre: servicio.nombre,
              descripcion: servicio.descripcion,
              precio: servicio.precio,
              categoria: servicio.categoria,
              disponible: servicio.disponible,
              createdAt: servicio.createdAt,
              updatedAt: servicio.updatedAt
            },
            vecesAgregado: servicio._count.carritoItems,
            cantidadTotal: servicio._count.carritoItems
          }))
        },
        pagos: {
          porEstado: pagosPorEstado.map(pago => ({
            estado: pago.estado,
            cantidad: pago._count.id,
            monto: Number(pago._sum.monto || 0)
          })),
          porDia: pagosPorDia.map(pago => ({
            fecha: pago.createdAt,
            cantidad: pago._count.id,
            monto: Number(pago._sum.monto || 0)
          }))
        },
        carritos: {
          creados: carritosCreados,
          convertidos: carritosConvertidos,
          tasaConversion: `${tasaConversion}%`,
          itemsPopulares: serviciosEnCarrito.slice(0, 5).map(servicio => ({
            servicio: {
              id: servicio.id,
              nombre: servicio.nombre,
              descripcion: servicio.descripcion,
              precio: servicio.precio,
              categoria: servicio.categoria,
              disponible: servicio.disponible,
              createdAt: servicio.createdAt,
              updatedAt: servicio.updatedAt
            },
            cantidadAgregada: servicio._count.carritoItems
          }))
        },
        estadisticasGenerales: {
          totalClientes: totalUsuarios,
          totalServicios,
          suscripcionesActivas,
          pagosCompletados,
          carritosActivos
        }
      };

      res.status(200).json({
        success: true,
        data: reporteActividad,
        message: 'Reporte de actividad obtenido exitosamente'
      });

    } catch (error) {
      console.error('Error al obtener reporte de actividad:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al obtener reporte de actividad'
      });
    }
  },

  // Método auxiliar para procesar ventas por período
  procesarVentasPorPeriodo: (ventas: any[], periodo: string, fechaInicio: Date, fechaFin: Date) => {
    // Esta función agrupa las ventas según el período especificado
    const ventasMap = new Map();
    
    ventas.forEach(venta => {
      let key: string;
      const fecha = new Date(venta.createdAt);
      
      switch (periodo) {
        case 'diario':
          key = fecha.toISOString().split('T')[0];
          break;
        case 'semanal':
          const inicioSemana = new Date(fecha);
          inicioSemana.setDate(fecha.getDate() - fecha.getDay());
          key = inicioSemana.toISOString().split('T')[0];
          break;
        case 'mensual':
          key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'anual':
          key = fecha.getFullYear().toString();
          break;
        default:
          key = fecha.toISOString().split('T')[0];
      }
      
      if (!ventasMap.has(key)) {
        ventasMap.set(key, {
          periodo: key,
          ingresos: 0,
          cantidadVentas: 0
        });
      }
      
      const data = ventasMap.get(key);
      data.ingresos += Number(venta._sum.monto || 0);
      data.cantidadVentas += venta._count.id;
      ventasMap.set(key, data);
    });
    
    return Array.from(ventasMap.values()).sort((a, b) => a.periodo.localeCompare(b.periodo));
  }
};