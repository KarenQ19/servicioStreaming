import { Request, Response } from 'express';
export declare const metodoPagoController: {
    seleccionar: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    obtenerMetodosDisponibles: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    validarMetodo: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    obtenerMetodoPreferido: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    removerMetodoPreferido: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=metodoPagoController.d.ts.map