import { api } from './api';

export interface Servicio {
  id: string;
  nombre: string;
  descripcion: string;
  imagen?: string;
  logoUrl?: string;
  logo?: string;
  logo_url?: string;
  precio: number;
  categoria: string;
  disponible: boolean;
  caracteristicas: string[];
  createdAt: string;
  updatedAt: string;
  administrador: {
    id: string;
    nombre: string;
    email: string;
  };
  _count?: {
    suscripciones: number;
    carritoItems: number;
  };
  estadisticas?: {
    totalSuscripciones: number;
    enCarritos: number;
    suscripcionesActivas: number;
  };
  suscripciones?: Array<{
    id: string;
    estado: string;
    fechaInicio: string;
    fechaFin: string;
    cliente: {
      id: string;
      nombre: string;
    };
  }>;
}

export interface CatalogoResponse {
  success: boolean;
  data: {
    servicios: Servicio[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  };
}

export interface BusquedaResponse {
  success: boolean;
  data: {
    servicios: Servicio[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
    query: string;
  };
}

export interface CategoriaInfo {
  categoria: string;
  count: number;
  serviciosDisponibles: number;
}

export interface CategoriasResponse {
  success: boolean;
  data: {
    categorias: CategoriaInfo[];
    total: number;
  };
}

export interface DisponibilidadResponse {
  success: boolean;
  data: {
    disponible: boolean;
    suscripcionesActivas: number;
    itemsEnCarrito: number;
    capacidadMaxima?: number;
    porcentajeUso?: number;
  };
}

export const catalogoService = {
  // Consultar catálogo completo
  async consultarCatalogo(params?: {
    page?: number;
    limit?: number;
    categoria?: string;
    disponible?: boolean;
  }): Promise<CatalogoResponse> {
    const response = await api.get('/catalogo', { params });
    return response.data;
  },

  // Buscar servicios
  async buscarServicios(params: {
    q: string;
    categoria?: string;
    precioMin?: number;
    precioMax?: number;
    disponible?: boolean;
    page?: number;
    limit?: number;
  }): Promise<BusquedaResponse> {
    const response = await api.get('/catalogo/buscar', { params });
    return response.data;
  },

  // Filtrar servicios
  async filtrarServicios(params: {
    categoria?: string;
    precioMin?: number;
    precioMax?: number;
    disponible?: boolean;
    ordenarPor?: 'precio' | 'nombre' | 'popularidad' | 'fecha';
    orden?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<CatalogoResponse> {
    const response = await api.get('/catalogo/filtrar', { params });
    return response.data;
  },

  // Obtener categorías disponibles
  async obtenerCategorias(): Promise<CategoriasResponse> {
    const response = await api.get('/catalogo/categorias');
    return response.data;
  },

  // Obtener detalles de un servicio
  async obtenerDetallesServicio(id: string): Promise<{ success: boolean; data: Servicio }> {
    const response = await api.get(`/servicios/${id}`);
    // El backend devuelve { success: true, data: { servicio: {...} } }
    // Necesitamos extraer el servicio del data
    if (response.data.success && response.data.data.servicio) {
      return {
        success: true,
        data: response.data.data.servicio
      };
    }
    return response.data;
  },

  // Verificar disponibilidad de un servicio
  async verificarDisponibilidad(id: string): Promise<DisponibilidadResponse> {
    const response = await api.get(`/servicios/${id}/disponibilidad`);
    return response.data;
  },

  // APIs específicas para clientes
  cliente: {
    // Buscar servicios para clientes
    async buscarServicios(params: {
      q: string;
      categoria?: string;
      precioMin?: number;
      precioMax?: number;
      page?: number;
      limit?: number;
    }): Promise<BusquedaResponse> {
      const response = await api.get('/cliente/servicios/buscar', { params });
      return response.data;
    },

    // Consultar servicios para clientes
    async consultarServicios(params?: {
      page?: number;
      limit?: number;
      categoria?: string;
      ordenarPor?: 'popularidad' | 'precio' | 'nombre' | 'novedad';
    }): Promise<CatalogoResponse> {
      const response = await api.get('/cliente/servicios', { params });
      return response.data;
    },

    // Filtrar servicios para clientes
    async filtrarServicios(params: {
      categoria?: string;
      precioMin?: number;
      precioMax?: number;
      popularidad?: 'alta' | 'media' | 'baja';
      novedad?: boolean;
      ordenarPor?: 'precio' | 'popularidad' | 'nombre' | 'novedad';
      orden?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    }): Promise<CatalogoResponse> {
      const response = await api.get('/cliente/servicios/filtrar', { params });
      return response.data;
    },
  },
};

export default catalogoService;
