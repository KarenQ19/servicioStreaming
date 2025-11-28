import { api } from './api';

export interface MetodoPago {
  id: string;
  tipo: 'TARJETA_CREDITO' | 'TARJETA_DEBITO' | 'TRANSFERENCIA' | 'QR' | 'EFECTIVO';
  nombre: string;
  descripcion: string;
  disponible: boolean;
  configuracion: Record<string, unknown>;
  permiteValidacionOCR?: boolean;
}

export interface Pago {
  id: string;
  monto: number;
  estado: 'PENDIENTE' | 'COMPLETADO' | 'FALLIDO' | 'REEMBOLSADO';
  metodoPagoId: string;
  metodoPago?: MetodoPago;
  clienteId: string;
  carritoId?: string;
  suscripcionId?: string;
  descripcion?: string;
  referencia?: string;
  createdAt: string;
  updatedAt: string;
  qr?: QRCode;
  cliente?: {
    id: string;
    nombre: string;
    email: string;
  };
  suscripcion?: {
    servicio?: {
      id: string;
      nombre: string;
      precio?: number;
      categoria?: string;
    };
  };
  carrito?: {
    items: Array<{
      servicio: { id: string; nombre: string; precio?: number; categoria?: string };
    }>;
  };
}

export interface QRCode {
  id: string;
  codigo: string;
  pagoId: string;
  estado: 'ACTIVO' | 'USADO' | 'EXPIRADO';
  imagenBase64: string;
  qrImage?: string;
  createdAt: string;
  expiresAt: string;
}

export interface ProcesarPagoRequest {
  carritoId?: string;
  suscripcionId?: string;
  metodoPagoId: string;
  monto: number;
  descripcion?: string;
  datosFacturacion?: {
    nombre: string;
    email: string;
    telefono?: string;
    direccion?: string;
  };
  generarQR?: boolean;
}

export interface HistorialPagosResponse {
  pagos: Pago[];
  paginacion: {
    paginaActual: number;
    totalPaginas: number;
    totalRegistros: number;
    registrosPorPagina: number;
    hayPaginaAnterior: boolean;
    hayPaginaSiguiente: boolean;
  };
  estadisticas: {
    totalPagos: number;
    montoTotal: number;
    promedioPorPago: number;
    estadisticasPorEstado: Array<{
      estado: string;
      cantidad: number;
      montoTotal: number;
    }>;
    metodosMasUsados: Array<{
      metodoPago: MetodoPago;
      _count: { _all: number };
      _sum: { monto: number };
    }>;
  };
}

export interface ResumenPagosResponse {
  resumenGeneral: {
    totalPagos: number;
    montoTotal: number;
    promedioMensual: number;
  };
  estadosPagos: {
    pendientes: { cantidad: number; monto: number };
    completados: { cantidad: number; monto: number };
    fallidos: { cantidad: number; monto: number };
    reembolsados: { cantidad: number; monto: number };
  };
  pagosRecientes: Pago[];
  metodoPagoPreferido?: MetodoPago;
  alertas: {
    tienePagosPendientes: boolean;
    tienePagosFallidos: boolean;
    necesitaMetodoPreferido: boolean;
  };
}

class PagoService {
  // Métodos de pago
  async obtenerMetodosDisponibles(): Promise<MetodoPago[]> {
    const response = await api.get('/metodos-pago');
    return response.data.data.metodosPago || [];
  }

  async seleccionarMetodoPreferido(metodoPagoId: string): Promise<void> {
    await api.post('/metodos-pago/seleccionar', { metodoPagoId });
  }

  async validarMetodoPago(metodoPagoId: string): Promise<boolean> {
    const response = await api.get(`/metodos-pago/${metodoPagoId}/validar`);
    return response.data.valido;
  }

  async obtenerMetodoPreferido(): Promise<MetodoPago | null> {
    try {
      const response = await api.get('/metodos-pago');
      return response.data.data.metodoPagoPreferido || null;
    } catch {
      return null;
    }
  }

  // Pagos
  async procesarPago(datos: ProcesarPagoRequest): Promise<{ pago: Pago; qr?: QRCode }> {
    const response = await api.post('/pagos/procesar', datos);
    return response.data.data;
  }

  async validarPago(pagoId: string): Promise<boolean> {
    const response = await api.get(`/pagos/${pagoId}/validar`);
    return response.data.valido;
  }

  async consultarEstadoPago(pagoId: string): Promise<Pago> {
    const response = await api.get(`/pagos/${pagoId}/estado`);
    return response.data.data;
  }

  async reembolsarPago(pagoId: string, motivo?: string): Promise<Pago> {
    const response = await api.post(`/pagos/${pagoId}/reembolso`, { motivo });
    return response.data.data;
  }

  // QR
  async generarQR(pagoId: string): Promise<QRCode> {
    const response = await api.post('/qr/generar', { pagoId });
    return response.data.data;
  }

  async validarQR(codigo: string): Promise<{ valido: boolean; pago?: Pago }> {
    const response = await api.get(`/qr/${codigo}/validar`);
    return response.data;
  }

  async consultarEstadoQR(qrId: string): Promise<QRCode> {
    const response = await api.get(`/qr/${qrId}/estado`);
    return response.data.data;
  }

  async usarQR(codigo: string): Promise<{ pago: Pago; qr: QRCode }> {
    const response = await api.post(`/qr/${codigo}/usar`);
    return response.data.data;
  }

  // Cliente - Pagos
  async seleccionarMetodoPagoCliente(metodoPagoId: string, establecerComoPreferido = true): Promise<{
    cliente: { id: string; nombre: string; email: string };
    metodoPagoSeleccionado: MetodoPago;
    esNuevoPreferido: boolean;
    metodoPagoAnterior: MetodoPago | null;
    historialReciente: Pago[];
    estadisticas: { totalPagosConEsteMetodo: number; ultimoUso: string | null };
  }> {
    const response = await api.post('/clientes/metodo-pago', {
      metodoPagoId,
      establecerComoPreferido
    });
    return response.data.data;
  }

  async consultarHistorialPagos(filtros?: {
    page?: number;
    limit?: number;
    estado?: string;
    metodoPagoId?: string;
    fechaInicio?: string;
    fechaFin?: string;
    ordenarPor?: string;
    orden?: 'asc' | 'desc';
  }): Promise<HistorialPagosResponse> {
    const params = new URLSearchParams();
    
    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await api.get(`/clientes/pagos?${params.toString()}`);
    return response.data.data;
  }

  // Historial para admin (todos los pagos)
  async consultarHistorialPagosAdmin(filtros?: {
    page?: number;
    limit?: number;
    estado?: string;
    metodoPagoId?: string;
    fechaInicio?: string;
    fechaFin?: string;
    ordenarPor?: string;
    orden?: 'asc' | 'desc';
  }): Promise<{ pagos: Pago[]; paginacion: any }> {
    const params = new URLSearchParams();
    
    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await api.get(`/admin/pagos?${params.toString()}`);
    return response.data.data;
  }

  async obtenerResumenPagos(): Promise<ResumenPagosResponse> {
    const response = await api.get('/clientes/pagos/resumen');
    return response.data.data;
  }

  // Procesar pagos completados pendientes (crea suscripciones desde carritos activos)
  async procesarPagosCompletados(): Promise<any> {
    const response = await api.post('/pagos/procesar-completados');
    return response.data;
  }

  // Utilidades
  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(precio);
  }

  formatearFecha(fecha: string): string {
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(fecha));
  }

  obtenerIconoMetodo(tipo: string): string {
    const iconos: Record<string, string> = {
      'TARJETA_CREDITO': 'FaCreditCard',
      'TARJETA_DEBITO': 'FaCreditCard',
      'TRANSFERENCIA': 'FaUniversity',
      'QR': 'FaQrcode',
      'EFECTIVO': 'FaMoneyBillWave'
    };
    return iconos[tipo] || 'FaCreditCard';
  }

  obtenerIconoEstado(estado: string): string {
    const iconos: Record<string, string> = {
      'PENDIENTE': 'FaClock',
      'COMPLETADO': 'FaCheckCircle',
      'FALLIDO': 'FaTimesCircle',
      'REEMBOLSADO': 'FaUndoAlt'
    };
    return iconos[estado] || 'FaClock';
  }

  obtenerColorEstado(estado: string): string {
    const colores: Record<string, string> = {
      'PENDIENTE': '#fbbf24',
      'COMPLETADO': '#10b981',
      'FALLIDO': '#ef4444',
      'REEMBOLSADO': '#6b7280'
    };
    return colores[estado] || '#6b7280';
  }
}

export const pagoService = new PagoService();
