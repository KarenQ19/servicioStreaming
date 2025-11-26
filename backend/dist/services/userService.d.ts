import { ActualizarPerfil } from '../types';
export declare class UserService {
    static updateClientProfile(userId: string, data: ActualizarPerfil): Promise<{
        role: string;
        id: string;
        email: string;
        nombre: string;
        telefono: string;
        activo: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    static updateAdminProfile(userId: string, data: ActualizarPerfil): Promise<{
        role: string;
        id: string;
        email: string;
        nombre: string;
        activo: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    static getClientWithSubscriptions(userId: string): Promise<{
        suscripciones: ({
            servicio: {
                id: string;
                nombre: string;
                descripcion: string;
                precio: number;
                categoria: string;
                disponible: boolean;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            estado: import(".prisma/client").$Enums.EstadoSuscripcion;
            fechaInicio: Date;
            fechaFin: Date;
            clienteId: string;
            servicioId: string;
        })[];
        carritos: ({
            items: ({
                servicio: {
                    id: string;
                    nombre: string;
                    precio: number;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                servicioId: string;
                carritoId: string;
                precio: number;
                cantidad: number;
            })[];
        } & {
            id: string;
            activo: boolean;
            createdAt: Date;
            updatedAt: Date;
            clienteId: string;
        })[];
    } & {
        id: string;
        email: string;
        googleId: string | null;
        facebookId: string | null;
        nombre: string;
        password: string | null;
        telefono: string | null;
        activo: boolean;
        createdAt: Date;
        updatedAt: Date;
        proveedor: import(".prisma/client").$Enums.TipoProveedor;
        avatar: string | null;
    }>;
    static deactivateClient(userId: string): Promise<{
        id: string;
        email: string;
        nombre: string;
        activo: boolean;
    }>;
    static reactivateClient(userId: string): Promise<{
        id: string;
        email: string;
        nombre: string;
        activo: boolean;
    }>;
    static getAllClients(page?: number, limit?: number): Promise<{
        clients: {
            id: string;
            email: string;
            nombre: string;
            telefono: string;
            activo: boolean;
            createdAt: Date;
            _count: {
                suscripciones: number;
            };
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
}
//# sourceMappingURL=userService.d.ts.map