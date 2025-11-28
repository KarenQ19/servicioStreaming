import { api } from './api';

export interface Suscripcion {
  id: number;
  clienteId: number;
  servicioId: number;
  fechaInicio: string;
  fechaFin: string;
  estado: 'activa' | 'pausada' | 'cancelada' | 'vencida';
  precio: number;
  servicio: {
    id: number;
    nombre: string;
    descripcion: string;
    precio: number;
    categoria: string;
    logoUrl?: string;
    logo_url?: string;
    imagen?: string;
  };
  credenciales?: {
    id: number;
    usuario: string;
    password: string;
    activas: boolean;
    urlAcceso?: string;
  }[];
  pago?: {
    id: number;
    monto: number;
    fechaPago: string;
    metodoPago: string;
    estado: string;
  };
}

export interface SuscripcionDetalle extends Suscripcion {
  diasRestantes: number;
  estaVencida: boolean;
}

export interface CrearSuscripcionRequest {
  servicioId: number;
  metodoPago: string;
}

export interface CrearSuscripcionDesdeCarritoRequest {
  metodoPagoId: string;
}

export interface SuscripcionesResponse {
  suscripciones: Suscripcion[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

class SuscripcionService {
  async obtenerSuscripciones(
    pagina: number = 1,
    limite: number = 10,
    estado?: string
  ): Promise<SuscripcionesResponse> {
    const params = new URLSearchParams({
      page: pagina.toString(),
      limit: limite.toString(),
    });

    if (estado) {
      params.append('estado', estado);
    }

    const response = await api.get(`/suscripciones?${params}`);
    return response.data.data; // La API devuelve { success, data, message }
  }

  async crearSuscripcionDesdeCarrito(
    data: CrearSuscripcionDesdeCarritoRequest
  ): Promise<{ suscripciones: Suscripcion[]; mensaje: string }> {
    const response = await api.post('/suscripciones/carrito', data);
    return response.data;
  }

  async crearSuscripcion(
    data: CrearSuscripcionRequest
  ): Promise<{ suscripcion: Suscripcion; mensaje: string }> {
    const response = await api.post('/suscripciones', data);
    return response.data;
  }

  async obtenerDetalleSuscripcion(id: number): Promise<SuscripcionDetalle> {
    const response = await api.get(`/suscripciones/${id}`);
    return response.data;
  }

  async cancelarSuscripcion(id: number): Promise<{ mensaje: string }> {
    const response = await api.patch(`/suscripciones/${id}/cancelar`);
    return response.data;
  }

  async pausarSuscripcion(id: number): Promise<{ mensaje: string }> {
    const response = await api.patch(`/suscripciones/${id}/pausar`);
    return response.data;
  }

  async reactivarSuscripcion(id: number): Promise<{ mensaje: string }> {
    const response = await api.patch(`/suscripciones/${id}/reactivar`);
    return response.data;
  }
}

export const suscripcionService = new SuscripcionService();
