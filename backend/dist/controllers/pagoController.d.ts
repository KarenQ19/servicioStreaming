import { Request, Response } from 'express';
export declare const pagoController: {
    procesar: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    validar: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    reembolsar: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    consultarEstado: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    procesarPagoCompletado: (pagoId: string) => Promise<{
        suscripcionesCreadas: any[];
        credencialesAsignadas: any[];
        carritoDesactivado: boolean;
    }>;
    completar: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    procesarCompletados: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=pagoController.d.ts.map