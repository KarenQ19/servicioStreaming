import api from './api';
import type { 
  Servicio, 
  User, 
  Carrito
} from '../types';

// Interfaces específicas para administración
export interface ServicioAdmin extends Servicio {
  administrador: {
    id: string;
    nombre: string;
    email: string;
  };
  metricas: {
    suscripcionesActivas: number;
    enCarritos: number;
    ingresosMensuales: number;
    popularidad: number;
  };
}

export interface ClienteAdmin extends User {
  metricas: {
    suscripcionesActivas: number;
    totalPagos: number;
    gastoTotal: number;
    gastoMensual: number;
    ultimoPago: string | null;
  };
}

export interface ReporteVentas {
  resumen: {
    ingresoTotal: number;
    cantidadVentas: number;
    ticketPromedio: number;
    periodo: {
      inicio: Date;
      fin: Date;
    };
  };
  ventasPorPeriodo: Array<{
    periodo: string;
    ingresos: number;
    cantidadVentas: number;
  }>;
  ventasPorServicio: Array<{
    servicio: Servicio;
    totalVentas: number;
    cantidadVentas: number;
    ingresos: number;
  }>;
  topClientes: Array<{
    cliente: User;
    totalGastado: number;
    cantidadCompras: number;
  }>;
  metodosPopulares: Array<{
    metodo: {
      id: string;
      tipo: string;
      proveedor: string;
    };
    cantidadUsos: number;
    montoTotal: number;
  }>;
  estadisticas: {
    nuevosClientes: number;
    nuevasSuscripciones: number;
    suscripcionesCanceladas: number;
    tasaRetencion: string;
  };
}

export interface ReporteActividad {
  resumen: {
    periodo: {
      inicio: Date;
      fin: Date;
    };
    metricas: {
      usuariosActivos: number;
      totalUsuarios: number;
      tasaActividad: string;
      carritosCreados: number;
      carritosConvertidos: number;
      tasaConversion: string;
    };
  };
  usuarios: {
    registrosPorDia: Array<{
      createdAt: Date;
      _count: { id: number };
    }>;
    usuariosActivos: number;
    totalUsuarios: number;
  };
  servicios: {
    masPopulares: Array<{
      servicio: Servicio;
      suscripciones: number;
    }>;
    masAgregadosCarrito: Array<{
      servicio: Servicio;
      vecesAgregado: number;
      cantidadTotal: number;
    }>;
  };
  pagos: {
    porEstado: Array<{
      estado: string;
      cantidad: number;
      monto: number;
    }>;
    porDia: Array<{
      fecha: Date;
      cantidad: number;
      monto: number;
    }>;
  };
  carritos: {
    creados: number;
    convertidos: number;
    tasaConversion: string;
    itemsPopulares: Array<{
      servicio: Servicio;
      cantidadAgregada: number;
    }>;
  };
  estadisticasGenerales: {
    totalClientes: number;
    totalServicios: number;
    suscripcionesActivas: number;
    pagosCompletados: number;
    carritosActivos: number;
  };
}

export interface FiltrosCatalogo {
  categoria?: string;
  disponible?: boolean;
  page?: number;
  limit?: number;
}

export interface FiltrosClientes {
  activo?: boolean;
  page?: number;
  limit?: number;
  search?: string;
  orderBy?: string;
  order?: 'asc' | 'desc';
}

export interface FiltrosReportes {
  fechaInicio?: string;
  fechaFin?: string;
  periodo?: 'diario' | 'semanal' | 'mensual' | 'anual';
  servicio?: string;
  cliente?: string;
  tipo?: 'general' | 'usuarios' | 'servicios' | 'pagos';
}

export interface CrearServicioData {
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  disponible?: boolean;
  logoUrl?: string;
  imagen?: string;
  logo?: string;
  logo_url?: string;
  caracteristicas?: Record<string, any>;
}

export interface ActualizarServicioData extends Partial<CrearServicioData> {}

export interface SuspenderClienteData {
  motivo: string;
  duracion?: string;
}

export const adminService = {
  // ===== GESTIÓN DE CATÁLOGO =====
  async consultarCatalogo(filtros: FiltrosCatalogo = {}): Promise<{
    servicios: ServicioAdmin[];
    estadisticas: any;
    pagination: any;
  }> {
    console.log('📊 Consultando catálogo admin:', filtros);
    const params = new URLSearchParams();
    
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/admin/catalogo?${params.toString()}`);
    console.log('✅ Catálogo obtenido:', response.data);
    return response.data.data;
  },

  // ===== GESTIÓN DE SERVICIOS (CRUD) =====
  async crearServicio(data: CrearServicioData): Promise<ServicioAdmin> {
    console.log('➕ Creando servicio:', data);
    const response = await api.post('/admin/servicios', data);
    console.log('✅ Servicio creado:', response.data);
    return response.data.data;
  },

  async actualizarServicio(id: string, data: ActualizarServicioData): Promise<ServicioAdmin> {
    console.log('✏️ Actualizando servicio:', { id, data });
    const response = await api.put(`/admin/servicios/${id}`, data);
    console.log('✅ Servicio actualizado:', response.data);
    return response.data.data;
  },

  async eliminarServicio(id: string): Promise<void> {
    console.log('🗑️ Eliminando servicio:', id);
    const response = await api.delete(`/admin/servicios/${id}`);
    console.log('✅ Servicio eliminado:', response.data);
  },

  async subirLogo(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    // En caso de que el backend espere otras claves, se envía duplicado
    formData.append('logo', file);
    formData.append('imagen', file);

    const response = await api.post('/admin/servicios/upload-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    const url =
      response.data?.url ||
      response.data?.data?.url ||
      response.data?.data?.location ||
      response.data?.location ||
      response.data?.data?.logoUrl ||
      response.data?.logoUrl ||
      response.data?.data?.imagen ||
      response.data?.imagen;
    if (!url) {
      throw new Error('No se pudo obtener la URL del logo');
    }
    return url;
  },

  // ===== GESTIÓN DE CLIENTES =====
  async consultarClientes(filtros: FiltrosClientes = {}): Promise<{
    clientes: ClienteAdmin[];
    pagination: any;
  }> {
    console.log('👥 Consultando clientes:', filtros);
    const params = new URLSearchParams();
    
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/admin/clientes?${params.toString()}`);
    console.log('✅ Clientes obtenidos:', response.data);
    return response.data.data;
  },

  async suspenderCliente(id: string, data: SuspenderClienteData): Promise<{
    cliente: User;
    suscripcionesPausadas: number;
    motivo: string;
    duracion?: string;
  }> {
    console.log('⏸️ Suspendiendo cliente:', { id, data });
    const response = await api.post(`/admin/clientes/${id}/suspender`, data);
    console.log('✅ Cliente suspendido:', response.data);
    return response.data.data;
  },

  async consultarCarritoCliente(idCliente: string): Promise<{
    cliente: User;
    carritos: Carrito[];
    estadisticas: any;
  }> {
    console.log('🛒 Consultando carrito del cliente:', idCliente);
    const response = await api.get(`/admin/carritos/${idCliente}`);
    console.log('✅ Carrito obtenido:', response.data);
    return response.data.data;
  },

  // ===== REPORTES =====
  async consultarReportesVentas(filtros: FiltrosReportes = {}): Promise<ReporteVentas> {
    console.log('📈 Consultando reportes de ventas:', filtros);
    const params = new URLSearchParams();
    
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/admin/reportes/ventas?${params.toString()}`);
    console.log('✅ Reporte de ventas obtenido:', response.data);
    return response.data.data;
  },

  async consultarReportesActividad(filtros: FiltrosReportes = {}): Promise<ReporteActividad> {
    console.log('📊 Consultando reportes de actividad:', filtros);
    const params = new URLSearchParams();
    
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/admin/reportes/actividad?${params.toString()}`);
    console.log('✅ Reporte de actividad obtenido:', response.data);
    return response.data.data;
  },

  // ===== MÉTODOS AUXILIARES =====
  async obtenerEstadisticasGenerales(): Promise<{
    totalClientes: number;
    clientesActivos: number;
    totalServicios: number;
    serviciosActivos: number;
    suscripcionesActivas: number;
    ingresosMensuales: number;
    crecimientoMensual: number;
  }> {
    console.log('📊 Obteniendo estadísticas generales...');
    
    // Obtener datos del catálogo y clientes para calcular estadísticas
    const [catalogoData, clientesData] = await Promise.all([
      this.consultarCatalogo({ limit: 1 }),
      this.consultarClientes({ limit: 1 })
    ]);

    // Calcular estadísticas básicas
    const estadisticas = {
      totalClientes: clientesData.pagination.totalItems,
      clientesActivos: catalogoData.estadisticas?.serviciosActivos || 0,
      totalServicios: catalogoData.pagination.totalItems,
      serviciosActivos: catalogoData.estadisticas?.serviciosActivos || 0,
      suscripcionesActivas: 0, // Se calculará desde reportes
      ingresosMensuales: 0, // Se calculará desde reportes
      crecimientoMensual: 0 // Se calculará desde reportes
    };

    console.log('✅ Estadísticas generales:', estadisticas);
    return estadisticas;
  },

  // Método para exportar reportes (futuro)
  async exportarReporte(tipo: 'ventas' | 'actividad', formato: 'csv' | 'pdf', filtros: FiltrosReportes = {}): Promise<Blob> {
    console.log('📤 Exportando reporte:', { tipo, formato, filtros });
    
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });
    params.append('formato', formato);

    const response = await api.get(`/admin/reportes/${tipo}/export?${params.toString()}`, {
      responseType: 'blob'
    });
    
    console.log('✅ Reporte exportado');
    return response.data;
  }
};
