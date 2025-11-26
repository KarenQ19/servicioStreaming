// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  nombre: string;
  email: string;
  telefono: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface User {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  role: 'CLIENTE' | 'ADMINISTRADOR';
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

// Service types
export interface Servicio {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  disponible: boolean;
  imagen?: string;
  logoUrl?: string;
  logo?: string;
  logo_url?: string;
  caracteristicas?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ServicioDetalle extends Servicio {
  administrador: {
    id: string;
    nombre: string;
  };
}

// Cart types
export interface CarritoItem {
  id: string;
  cantidad: number;
  servicio: Servicio;
}

export interface Carrito {
  id: string;
  items: CarritoItem[];
  total: number;
}

// Subscription types
export interface Suscripcion {
  id: string;
  fechaInicio: string;
  fechaFin: string;
  activa: boolean;
  servicio: Servicio;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Filter types
export interface FiltrosServicio {
  categoria?: string;
  precioMin?: number;
  precioMax?: number;
  disponible?: boolean;
}

// Navigation types
export interface NavItem {
  name: string;
  href: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}
