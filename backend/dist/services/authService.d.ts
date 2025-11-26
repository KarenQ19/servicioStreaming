import { LoginCredenciales, RegistroCliente, AuthResponse } from '../types';
export declare class AuthService {
    static registerClient(data: RegistroCliente): Promise<AuthResponse>;
    static loginClient(credentials: LoginCredenciales): Promise<AuthResponse>;
    static loginAdmin(credentials: LoginCredenciales): Promise<AuthResponse>;
    static getUserProfile(userId: string, role: 'CLIENTE' | 'ADMINISTRADOR'): Promise<{
        role: string;
        id: string;
        email: string;
        nombre: string;
        telefono: string;
        activo: boolean;
        createdAt: Date;
        updatedAt: Date;
    } | {
        role: string;
        id: string;
        email: string;
        nombre: string;
        activo: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
//# sourceMappingURL=authService.d.ts.map