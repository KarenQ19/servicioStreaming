import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/servicios - Listar todos los servicios
export const listarServicios = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoria, disponible, limit = '10', offset = '0' } = req.query;

    const where: any = {};
    
    if (categoria) {
      where.categoria = categoria;
    }
    
    if (disponible !== undefined) {
      where.disponible = disponible === 'true';
    }

    const servicios = await prisma.servicio.findMany({
      where,
      include: {
        administrador: {
          select: {
            id: true,
            nombre: true
          }
        },
        _count: {
          select: {
            suscripciones: true,
            carritoItems: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    const total = await prisma.servicio.count({ where });

    res.json({
      success: true,
      data: {
        servicios,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: total > parseInt(offset as string) + parseInt(limit as string)
        }
      }
    });
  } catch (error) {
    console.error('Error al listar servicios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// GET /api/servicios/:id - Mostrar detalles de un servicio
export const mostrarDetalles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'ID del servicio es requerido'
      });
      return;
    }

    const servicio = await prisma.servicio.findUnique({
      where: { id },
      include: {
        administrador: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        _count: {
          select: {
            suscripciones: true,
            carritoItems: true
          }
        },
        suscripciones: {
          where: {
            estado: 'ACTIVA'
          },
          select: {
            id: true,
            estado: true,
            fechaInicio: true,
            fechaFin: true,
            cliente: {
              select: {
                id: true,
                nombre: true
              }
            }
          },
          take: 5,
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!servicio) {
      res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
      return;
    }

    // Calcular estadísticas adicionales
    const estadisticas = {
      totalSuscripciones: servicio._count.suscripciones,
      enCarritos: servicio._count.carritoItems,
      suscripcionesActivas: servicio.suscripciones.length
    };

    res.json({
      success: true,
      data: {
        servicio: {
          ...servicio,
          estadisticas
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener detalles del servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// PUT /api/servicios/:id - Actualizar información del servicio (solo admin)
export const actualizarInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, categoria, disponible, caracteristicas, logoUrl, logo, logo_url, imagen } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'ID del servicio es requerido'
      });
      return;
    }

    // Verificar que el servicio existe
    const servicioExistente = await prisma.servicio.findUnique({
      where: { id },
      include: {
        administrador: true
      }
    });

    if (!servicioExistente) {
      res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
      return;
    }

    // Verificar que el usuario es admin y es el propietario del servicio
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (userRole !== 'ADMINISTRADOR') {
      res.status(403).json({
        success: false,
        message: 'Solo los administradores pueden actualizar servicios'
      });
      return;
    }

    if (servicioExistente.administradorId !== userId) {
      res.status(403).json({
        success: false,
        message: 'Solo puedes actualizar tus propios servicios'
      });
      return;
    }

    // Preparar datos para actualización
    const datosActualizacion: any = {};

    if (nombre !== undefined) datosActualizacion.nombre = nombre;
    if (descripcion !== undefined) datosActualizacion.descripcion = descripcion;
    if (precio !== undefined) datosActualizacion.precio = Number(precio);
    if (categoria !== undefined) datosActualizacion.categoria = categoria;
    if (disponible !== undefined) datosActualizacion.disponible = Boolean(disponible);
    if (caracteristicas !== undefined) datosActualizacion.caracteristicas = caracteristicas;
    if (logoUrl !== undefined || logo !== undefined || logo_url !== undefined || imagen !== undefined) {
      datosActualizacion.logoUrl = logoUrl || logo || logo_url || imagen || null;
    }

    // Actualizar servicio
    const servicioActualizado = await prisma.servicio.update({
      where: { id },
      data: datosActualizacion,
      include: {
        administrador: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        _count: {
          select: {
            suscripciones: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Servicio actualizado exitosamente',
      data: {
        servicio: servicioActualizado
      }
    });
  } catch (error) {
    console.error('Error al actualizar servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// GET /api/servicios/:id/disponibilidad - Verificar disponibilidad
export const verificarDisponibilidad = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'ID del servicio es requerido'
      });
      return;
    }

    const servicio = await prisma.servicio.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        disponible: true,
        precio: true,
        categoria: true,
        _count: {
          select: {
            suscripciones: {
              where: {
                estado: 'ACTIVA'
              }
            },
            carritoItems: true
          }
        }
      }
    });

    if (!servicio) {
      res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
      return;
    }

    // Calcular disponibilidad
    const disponibilidad = {
      disponible: servicio.disponible,
      suscripcionesActivas: servicio._count.suscripciones,
      enCarritos: servicio._count.carritoItems,
      estado: servicio.disponible ? 'DISPONIBLE' : 'NO_DISPONIBLE',
      mensaje: servicio.disponible 
        ? 'El servicio está disponible para suscripción'
        : 'El servicio no está disponible actualmente'
    };

    // Verificar si hay límites de capacidad (esto se puede personalizar según reglas de negocio)
    const limiteCapacidad = 1000; // Ejemplo: máximo 1000 suscripciones activas
    
    if (servicio.disponible && servicio._count.suscripciones >= limiteCapacidad) {
      disponibilidad.disponible = false;
      disponibilidad.estado = 'CAPACIDAD_COMPLETA';
      disponibilidad.mensaje = 'El servicio ha alcanzado su capacidad máxima';
    }

    res.json({
      success: true,
      data: {
        servicio: {
          id: servicio.id,
          nombre: servicio.nombre,
          precio: servicio.precio,
          categoria: servicio.categoria
        },
        disponibilidad
      }
    });
  } catch (error) {
    console.error('Error al verificar disponibilidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// GET /api/servicios/buscar - Buscar servicios por término
export const buscarServicios = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, categoria, disponible, limit = '10', offset = '0' } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Parámetro de búsqueda "q" es requerido'
      });
      return;
    }

    const where: any = {
      OR: [
        {
          nombre: {
            contains: q,
            mode: 'insensitive'
          }
        },
        {
          descripcion: {
            contains: q,
            mode: 'insensitive'
          }
        },
        {
          categoria: {
            contains: q,
            mode: 'insensitive'
          }
        }
      ]
    };

    // Filtros adicionales
    if (categoria) {
      where.categoria = categoria;
    }
    
    if (disponible !== undefined) {
      where.disponible = disponible === 'true';
    }

    const servicios = await prisma.servicio.findMany({
      where,
      include: {
        administrador: {
          select: {
            id: true,
            nombre: true
          }
        },
        _count: {
          select: {
            suscripciones: true,
            carritoItems: true
          }
        }
      },
      orderBy: [
        { disponible: 'desc' },
        { createdAt: 'desc' }
      ],
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    const total = await prisma.servicio.count({ where });

    res.json({
      success: true,
      data: {
        servicios,
        searchTerm: q,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: total > parseInt(offset as string) + parseInt(limit as string)
        }
      }
    });
  } catch (error) {
    console.error('Error al buscar servicios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// GET /api/servicios/filtrar - Filtrar servicios con múltiples criterios
export const filtrarServicios = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      categoria, 
      disponible, 
      precioMin, 
      precioMax, 
      ordenarPor = 'createdAt',
      orden = 'desc',
      limit = '10', 
      offset = '0' 
    } = req.query;

    const where: any = {};
    
    if (categoria) {
      where.categoria = categoria;
    }
    
    if (disponible !== undefined) {
      where.disponible = disponible === 'true';
    }

    if (precioMin || precioMax) {
      where.precio = {};
      if (precioMin) {
        where.precio.gte = parseFloat(precioMin as string);
      }
      if (precioMax) {
        where.precio.lte = parseFloat(precioMax as string);
      }
    }

    // Validar ordenamiento
    const validOrderBy = ['createdAt', 'precio', 'nombre'];
    const validOrder = ['asc', 'desc'];
    
    const orderBy: any = {};
    if (validOrderBy.includes(ordenarPor as string) && validOrder.includes(orden as string)) {
      orderBy[ordenarPor as string] = orden;
    } else {
      orderBy.createdAt = 'desc';
    }

    const servicios = await prisma.servicio.findMany({
      where,
      include: {
        administrador: {
          select: {
            id: true,
            nombre: true
          }
        },
        _count: {
          select: {
            suscripciones: true,
            carritoItems: true
          }
        }
      },
      orderBy,
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    const total = await prisma.servicio.count({ where });

    // Estadísticas adicionales
    const stats = await prisma.servicio.aggregate({
      where,
      _avg: { precio: true },
      _min: { precio: true },
      _max: { precio: true }
    });

    res.json({
      success: true,
      data: {
        servicios,
        filters: {
          categoria,
          disponible,
          precioMin,
          precioMax,
          ordenarPor,
          orden
        },
        stats: {
          precioPromedio: stats._avg.precio,
          precioMinimo: stats._min.precio,
          precioMaximo: stats._max.precio
        },
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: total > parseInt(offset as string) + parseInt(limit as string)
        }
      }
    });
  } catch (error) {
    console.error('Error al filtrar servicios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// GET /api/servicios/categorias - Obtener todas las categorías disponibles
export const obtenerCategorias = async (req: Request, res: Response): Promise<void> => {
  try {
    const categorias = await prisma.servicio.findMany({
      select: {
        categoria: true
      },
      distinct: ['categoria'],
      where: {
        disponible: true
      },
      orderBy: {
        categoria: 'asc'
      }
    });

    // Contar servicios por categoría
    const categoriasConConteo = await Promise.all(
      categorias.map(async (cat) => {
        const count = await prisma.servicio.count({
          where: {
            categoria: cat.categoria,
            disponible: true
          }
        });
        return {
          nombre: cat.categoria,
          count
        };
      })
    );

    res.json({
      success: true,
      data: {
        categorias: categoriasConConteo,
        total: categorias.length
      }
    });
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};
