import { Request, Response } from 'express';
export declare const obtenerMisCredenciales: (req: Request, res: Response) => Promise<void>;
export declare const agregarCredencialesAlPool: (req: Request, res: Response) => Promise<void>;
export declare const obtenerCredencialesDisponibles: (req: Request, res: Response) => Promise<void>;
export declare const obtenerCredencialesAsignadas: (req: Request, res: Response) => Promise<void>;
export declare const asignarCredencial: (servicioId: string, clienteId: string, suscripcionId: string) => Promise<{
    id: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
    clienteId: string | null;
    servicioId: string;
    suscripcionId: string | null;
    usuario: string;
    activas: boolean;
    asignadas: boolean;
    urlAcceso: string | null;
    notas: string | null;
}>;
export declare const liberarCredencial: (suscripcionId: string) => Promise<void>;
export declare const eliminarCredencialDelPool: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=credencialesController.d.ts.map