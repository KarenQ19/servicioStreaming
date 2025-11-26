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
export interface ActualizarPerfil {
    nombre?: string;
    telefono?: string;
    email?: string;
    password?: string;
}
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
export interface CarritoItem {
    id: string;
    servicioId: string;
    cantidad: number;
    precio: number;
}
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
export interface QRResponse {
    qrCode: string;
    qrId: string;
    expiresAt: Date;
}
export interface FiltrosReporte {
    fechaInicio?: Date;
    fechaFin?: Date;
    categoria?: string;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}
export interface JWTPayload {
    userId: string;
    email: string;
    role: 'CLIENTE' | 'ADMINISTRADOR';
    iat?: number;
    exp?: number;
}
//# sourceMappingURL=index.d.ts.map