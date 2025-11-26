import { api } from './api';

export interface ResultadoValidacionOCR {
  esValido: boolean;
  porcentajeCoincidencia: number;
  datosExtraidos: {
    monto?: string;
    fecha?: string;
    referencia?: string;
    transaccion?: string;
    banco?: string;
  };
  coincidencias: {
    monto: boolean;
    fecha: boolean;
    referencia: boolean;
    transaccion: boolean;
  };
  mensaje: string;
}

export interface HistorialValidacionesResponse {
  validaciones: ValidacionOCR[];
  paginacion: {
    paginaActual: number;
    totalPaginas: number;
    totalRegistros: number;
    registrosPorPagina: number;
    hayPaginaAnterior: boolean;
    hayPaginaSiguiente: boolean;
  };
  estadisticas: {
    totalValidaciones: number;
    validacionesExitosas: number;
    validacionesFallidas: number;
    porcentajeExito: number;
  };
}

export interface ValidacionOCR {
  id: string;
  imagenUrl: string;
  textoExtraido: string;
  datosExtraidos: any;
  confianzaOCR: number;
  esValido: boolean;
  coincidencias: any;
  porcentajeCoincidencia: number;
  pagoId: string;
  clienteId: string;
  pago: {
    id: string;
    monto: number;
    descripcion: string;
    createdAt: string;
  };
  cliente: {
    id: string;
    nombre: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

class ValidacionOCRService {
  async validarComprobante(pagoId: string, archivo: File): Promise<ResultadoValidacionOCR> {
    try {
      const formData = new FormData();
      formData.append('comprobante', archivo);
      formData.append('pagoId', pagoId);

      const response = await api.post(`/qr/${pagoId}/validar-ocr`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.data || response.data;
    } catch (error: any) {
      const mensaje =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Error al validar comprobante';
      throw new Error(mensaje);
    }
  }

  
async obtenerHistorial(filtros?: {
    page?: number;
    limit?: number;
    esValido?: boolean;
    fechaInicio?: string;
    fechaFin?: string;
    ordenarPor?: string;
    orden?: 'asc' | 'desc';
  }): Promise<HistorialValidacionesResponse> {
    const params = new URLSearchParams();
    
    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await api.get(`/qr/validaciones/historial?${params.toString()}`);
    return response.data.data;
  }

  async obtenerValidacion(id: string): Promise<ValidacionOCR> {
    const response = await api.get(`/qr/validaciones/${id}`);
    return response.data.data;
  }

  async reintentarValidacion(validacionId: string, nuevaImagen?: File): Promise<ResultadoValidacionOCR> {
    const formData = new FormData();
    if (nuevaImagen) {
      formData.append('imagen', nuevaImagen);
    }

    const response = await api.post(`/qr/validaciones/${validacionId}/reintentar`, formData, {
      headers: nuevaImagen ? { 'Content-Type': 'multipart/form-data' } : {},
    });

    return response.data.data;
  }

  async eliminarValidacion(id: string): Promise<void> {
    await api.delete(`/qr/validaciones/${id}`);
  }

  async obtenerEstadisticas(): Promise<{
    totalValidaciones: number;
    validacionesExitosas: number;
    validacionesFallidas: number;
    porcentajeExito: number;
    promedioConfianzaOCR: number;
    validacionesRecientes: ValidacionOCR[];
  }> {
    const response = await api.get('/qr/validaciones/estadisticas');
    return response.data.data;
  }

  async descargarImagen(validacionId: string): Promise<Blob> {
    const response = await api.get(`/qr/validaciones/${validacionId}/imagen`, {
      responseType: 'blob',
    });
    return response.data;
  }

  // Métodos auxiliares
  formatearConfianza(confianza: number): string {
    return `${(confianza * 100).toFixed(1)}%`;
  }

  formatearPorcentajeCoincidencia(porcentaje: number): string {
    return `${porcentaje.toFixed(1)}%`;
  }

  obtenerColorPorcentaje(porcentaje: number): string {
    if (porcentaje >= 80) return 'text-green-600';
    if (porcentaje >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  obtenerEstadoValidacion(esValido: boolean): string {
    return esValido ? 'Válido' : 'Inválido';
  }

  obtenerColorEstado(esValido: boolean): string {
    return esValido ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  }

  // Validación de imagen antes de subir
  validarImagen(imagen: File): { valida: boolean; error?: string } {
    const tiposPermitidos = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/webp'
    ];

    if (!tiposPermitidos.includes(imagen.type)) {
      return {
        valida: false,
        error: 'Formato de imagen no permitido. Use JPEG, PNG, GIF, BMP, TIFF o WebP.'
      };
    }

    const tamanoMaximo = 10 * 1024 * 1024; // 10MB
    if (imagen.size > tamanoMaximo) {
      return {
        valida: false,
        error: 'La imagen no debe superar los 10MB.'
      };
    }

    return { valida: true };
  }
}

export const validacionOCRService = new ValidacionOCRService();
export default ValidacionOCRService;
