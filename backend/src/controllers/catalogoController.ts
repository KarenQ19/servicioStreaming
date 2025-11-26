import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/catalogo - Consultar catálogo completo
export const consultarCatalogo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, categoria, disponible } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Construir filtros
    const where: any = {};
    
    if (categoria) {
      where.categoria = categoria;
    }
    
    if (disponible !== undefined) {
      where.disponible = disponible === 'true';
    }

    // Obtener servicios con paginación
    const [servicios, total] = await Promise.all([
      prisma.servicio.findMany({
        where,
        skip,
        take,
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
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.servicio.count({ where })
    ]);

    const totalPages = Math.ceil(total / take);

    res.json({
      success: true,
      data: {
        servicios,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalItems: total,
          itemsPerPage: take,
          hasNextPage: Number(page) < totalPages,
          hasPrevPage: Number(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Error al consultar catálogo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// GET /api/catalogo/buscar?q= - Buscar servicios
export const buscarServicio = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, categoria, precioMin, precioMax, page = 1, limit = 10 } = req.query;
    
    if (!q || typeof q !== 'string') {
      res.status(400).json({
        success: false,
        message: 'El parámetro de búsqueda "q" es requerido'
      });
      return;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Construir filtros de búsqueda
    const where: any = {
      AND: [
        {
          OR: [
            { nombre: { contains: q, mode: 'insensitive' } },
            { descripcion: { contains: q, mode: 'insensitive' } },
            { categoria: { contains: q, mode: 'insensitive' } }
          ]
        },
        { disponible: true }
      ]
    };

    if (categoria) {
      where.AND.push({ categoria: categoria });
    }

    if (precioMin) {
      where.AND.push({ precio: { gte: Number(precioMin) } });
    }

    if (precioMax) {
      where.AND.push({ precio: { lte: Number(precioMax) } });
    }

    const [servicios, total] = await Promise.all([
      prisma.servicio.findMany({
        where,
        skip,
        take,
        include: {
          administrador: {
            select: {
              id: true,
              nombre: true
            }
          },
          _count: {
            select: {
              suscripciones: true
            }
          }
        },
        orderBy: [
          { nombre: 'asc' },
          { precio: 'asc' }
        ]
      }),
      prisma.servicio.count({ where })
    ]);

    const totalPages = Math.ceil(total / take);

    res.json({
      success: true,
      data: {
        servicios,
        searchTerm: q,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalItems: total,
          itemsPerPage: take,
          hasNextPage: Number(page) < totalPages,
          hasPrevPage: Number(page) > 1
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

// GET /api/catalogo/filtrar - Filtrar servicios
export const filtrarServicios = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      categoria, 
      precioMin, 
      precioMax, 
      disponible, 
      ordenarPor = 'nombre',
      orden = 'asc',
      page = 1, 
      limit = 10 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Construir filtros
    const where: any = {};

    if (categoria) {
      where.categoria = categoria;
    }

    if (disponible !== undefined) {
      where.disponible = disponible === 'true';
    }

    if (precioMin || precioMax) {
      where.precio = {};
      if (precioMin) where.precio.gte = Number(precioMin);
      if (precioMax) where.precio.lte = Number(precioMax);
    }

    // Configurar ordenamiento
    const orderBy: any = {};
    const validOrderFields = ['nombre', 'precio', 'categoria', 'createdAt'];
    const orderField = validOrderFields.includes(ordenarPor as string) ? ordenarPor : 'nombre';
    const orderDirection = orden === 'desc' ? 'desc' : 'asc';
    
    orderBy[orderField as string] = orderDirection;

    const [servicios, total] = await Promise.all([
      prisma.servicio.findMany({
        where,
        skip,
        take,
        include: {
          administrador: {
            select: {
              id: true,
              nombre: true
            }
          },
          _count: {
            select: {
              suscripciones: true
            }
          }
        },
        orderBy
      }),
      prisma.servicio.count({ where })
    ]);

    const totalPages = Math.ceil(total / take);

    res.json({
      success: true,
      data: {
        servicios,
        filters: {
          categoria,
          precioMin: precioMin ? Number(precioMin) : null,
          precioMax: precioMax ? Number(precioMax) : null,
          disponible: disponible ? disponible === 'true' : null,
          ordenarPor: orderField,
          orden: orderDirection
        },
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalItems: total,
          itemsPerPage: take,
          hasNextPage: Number(page) < totalPages,
          hasPrevPage: Number(page) > 1
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

// GET /api/catalogo/categorias - Obtener categorías disponibles
export const obtenerCategorias = async (req: Request, res: Response): Promise<void> => {
  try {
    // Obtener categorías únicas con conteo de servicios
    const categorias = await prisma.servicio.groupBy({
      by: ['categoria'],
      where: {
        disponible: true
      },
      _count: {
        categoria: true
      },
      orderBy: {
        categoria: 'asc'
      }
    });

    // Formatear respuesta
    const categoriasFormateadas = categorias.map((cat: { categoria: string; _count: { categoria: number } }) => ({
      nombre: cat.categoria,
      totalServicios: cat._count.categoria
    }));

    // Obtener estadísticas adicionales
    const [totalServicios, totalCategorias] = await Promise.all([
      prisma.servicio.count({ where: { disponible: true } }),
      prisma.servicio.findMany({
        select: { categoria: true },
        distinct: ['categoria'],
        where: { disponible: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        categorias: categoriasFormateadas,
        estadisticas: {
          totalServicios,
          totalCategorias: totalCategorias.length
        }
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