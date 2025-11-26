import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Selección base de campos de servicio (incluye logo)
const selectServicioBase: any = {
  id: true,
  nombre: true,
  descripcion: true,
  precio: true,
  categoria: true,
  disponible: true,
  logoUrl: true,
  caracteristicas: true,
  createdAt: true,
  _count: {
    select: {
      suscripciones: {
        where: {
          estado: 'ACTIVA'
        }
      }
    }
  }
};

// GET /api/cliente/servicios/buscar - Buscar servicios para clientes
export const buscarServiciosCliente = async (req: Request, res: Response): Promise<void> => {
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

    // Construir filtros de búsqueda (solo servicios disponibles para clientes)
    const where: any = {
      AND: [
        {
          OR: [
            { nombre: { contains: q, mode: 'insensitive' } },
            { descripcion: { contains: q, mode: 'insensitive' } },
            { categoria: { contains: q, mode: 'insensitive' } }
          ]
        },
        { disponible: true } // Solo servicios disponibles
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

    const selectServicioBase: any = {
      id: true,
      nombre: true,
      descripcion: true,
      precio: true,
      categoria: true,
      disponible: true,
      logoUrl: true,
      caracteristicas: true,
      createdAt: true,
      _count: {
        select: {
          suscripciones: {
            where: {
              estado: 'ACTIVA'
            }
          }
        }
      }
    };

    const [servicios, total] = await Promise.all([
      prisma.servicio.findMany({
        where,
        skip,
        take,
        select: selectServicioBase,
        orderBy: [
          { nombre: 'asc' },
          { precio: 'asc' }
        ]
      }),
      prisma.servicio.count({ where })
    ]);

    const totalPages = Math.ceil(total / take);

    // Agregar información adicional para clientes
    const serviciosConInfo = servicios.map((servicio: any) => ({
      ...servicio,
      popularidad: servicio._count.suscripciones,
      esPopular: servicio._count.suscripciones > 10 // Ejemplo: más de 10 suscripciones activas
    }));

    res.json({
      success: true,
      data: {
        servicios: serviciosConInfo,
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
    console.error('Error al buscar servicios para cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// GET /api/cliente/servicios - Consultar servicios para clientes
export const consultarServicios = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, categoria, ordenarPor = 'popularidad' } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Construir filtros (solo servicios disponibles)
    const where: any = {
      disponible: true
    };
    
    if (categoria) {
      where.categoria = categoria;
    }

    // Configurar ordenamiento
    let orderBy: any = {};
    
    switch (ordenarPor) {
      case 'precio_asc':
        orderBy = { precio: 'asc' };
        break;
      case 'precio_desc':
        orderBy = { precio: 'desc' };
        break;
      case 'nombre':
        orderBy = { nombre: 'asc' };
        break;
      case 'reciente':
        orderBy = { createdAt: 'desc' };
        break;
      case 'popularidad':
      default:
        // Para popularidad, ordenaremos por número de suscripciones activas
        orderBy = { createdAt: 'desc' }; // Fallback, luego ordenaremos en memoria
        break;
    }

    // Obtener servicios
    const [servicios, total] = await Promise.all([
      prisma.servicio.findMany({
        where,
        skip,
        take,
        select: selectServicioBase,
        orderBy
      }),
      prisma.servicio.count({ where })
    ]);

    // Si se ordena por popularidad, ordenar en memoria
    let serviciosOrdenados = servicios;
    if (ordenarPor === 'popularidad') {
      serviciosOrdenados = servicios.sort((a: any, b: any) => 
        b._count.suscripciones - a._count.suscripciones
      );
    }

    const totalPages = Math.ceil(total / take);

    // Agregar información adicional para clientes
    const serviciosConInfo = serviciosOrdenados.map((servicio: any) => ({
      ...servicio,
      popularidad: servicio._count.suscripciones,
      esPopular: servicio._count.suscripciones > 10,
      esNuevo: new Date(servicio.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Nuevo si tiene menos de 30 días
    }));

    res.json({
      success: true,
      data: {
        servicios: serviciosConInfo,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalItems: total,
          itemsPerPage: take,
          hasNextPage: Number(page) < totalPages,
          hasPrevPage: Number(page) > 1
        },
        filtros: {
          categoria,
          ordenarPor
        }
      }
    });
  } catch (error) {
    console.error('Error al consultar servicios para cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// GET /api/cliente/servicios/filtrar - Filtrar servicios para clientes
export const filtrarServicios = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      categoria, 
      precioMin, 
      precioMax, 
      esPopular,
      esNuevo,
      ordenarPor = 'popularidad',
      page = 1, 
      limit = 10 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Construir filtros base (solo servicios disponibles)
    const where: any = {
      disponible: true
    };

    if (categoria) {
      where.categoria = categoria;
    }

    if (precioMin || precioMax) {
      where.precio = {};
      if (precioMin) where.precio.gte = Number(precioMin);
      if (precioMax) where.precio.lte = Number(precioMax);
    }

    // Filtro para servicios nuevos (últimos 30 días)
    if (esNuevo === 'true') {
      const fechaLimite = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      where.createdAt = { gte: fechaLimite };
    }

    // Configurar ordenamiento
    let orderBy: any = {};
    
    switch (ordenarPor) {
      case 'precio_asc':
        orderBy = { precio: 'asc' };
        break;
      case 'precio_desc':
        orderBy = { precio: 'desc' };
        break;
      case 'nombre':
        orderBy = { nombre: 'asc' };
        break;
      case 'reciente':
        orderBy = { createdAt: 'desc' };
        break;
      case 'popularidad':
      default:
        orderBy = { createdAt: 'desc' }; // Fallback
        break;
    }

    const [servicios, total] = await Promise.all([
      prisma.servicio.findMany({
        where,
        skip,
        take,
        select: selectServicioBase,
        orderBy
      }),
      prisma.servicio.count({ where })
    ]);

    // Aplicar filtros adicionales en memoria
    let serviciosFiltrados = servicios;

    // Filtrar por popularidad
    if (esPopular === 'true') {
      serviciosFiltrados = serviciosFiltrados.filter((servicio: any) => 
        servicio._count.suscripciones > 10
      );
    }

    // Ordenar por popularidad si es necesario
    if (ordenarPor === 'popularidad') {
      serviciosFiltrados = serviciosFiltrados.sort((a: any, b: any) => 
        b._count.suscripciones - a._count.suscripciones
      );
    }

    const totalFiltrados = serviciosFiltrados.length;
    const totalPages = Math.ceil(totalFiltrados / take);

    // Agregar información adicional para clientes
    const serviciosConInfo = serviciosFiltrados.map((servicio: any) => ({
      ...servicio,
      popularidad: servicio._count.suscripciones,
      esPopular: servicio._count.suscripciones > 10,
      esNuevo: new Date(servicio.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }));

    res.json({
      success: true,
      data: {
        servicios: serviciosConInfo,
        filtrosAplicados: {
          categoria,
          precioMin: precioMin ? Number(precioMin) : null,
          precioMax: precioMax ? Number(precioMax) : null,
          esPopular: esPopular === 'true',
          esNuevo: esNuevo === 'true',
          ordenarPor
        },
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalItems: totalFiltrados,
          itemsPerPage: take,
          hasNextPage: Number(page) < totalPages,
          hasPrevPage: Number(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Error al filtrar servicios para cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};
