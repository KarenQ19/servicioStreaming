// Auth types
export interface LoginCredenciales {
  email: string;
  password: string;
}

export interface RegistroCliente {
  nombre: string;
  email: string;
  password: string;
  telefono?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    email: string;
    nombre: string;
    role: 'CLIENTE' | 'ADMINISTRADOR';
  };
}

// User types
export interface ActualizarPerfil {
  nombre?: string;
  telefono?: string;
  email?: string;
  password?: string;
}

// Service types
export interface FiltrosServicio {
  categoria?: string;
  precioMin?: number;
  precioMax?: number;
  disponible?: boolean;
}

export interface NuevoServicio {
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  disponible?: boolean;
  caracteristicas?: string[];
}

export interface ActualizarServicio {
  nombre?: string;
  descripcion?: string;
  precio?: number;
  categoria?: string;
  disponible?: boolean;
  caracteristicas?: string[];
}

// Cart types
export interface CarritoItem {
  id: string;
  servicioId: string;
  cantidad: number;
  precio: number;
}

// Payment types
export interface DatosPago {
  carritoId: string;
  metodoPagoId: string;
  total: number;
}

export interface ResultadoPago {
  success: boolean;
  pagoId: string;
  estado: 'PENDIENTE' | 'COMPLETADO' | 'FALLIDO';
  qrCode?: string;
}

// QR types
export interface QRResponse {
  qrCode: string;
  qrId: string;
  expiresAt: Date;
}

// Report types
export interface FiltrosReporte {
  fechaInicio?: Date;
  fechaFin?: Date;
  categoria?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  email: string;
  role: 'CLIENTE' | 'ADMINISTRADOR';
  iat?: number;
  exp?: number;
}