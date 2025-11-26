import { Request, Response } from 'express';
export declare const qrController: {
    generarQR: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    validarQR: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    consultarEstadoQR: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    usarQR: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=qrController.d.ts.map