import { Request, Response } from 'express';
export declare class ValidacionOCRController {
    static validarComprobante(req: Request, res: Response): Promise<void>;
    static obtenerHistorialValidaciones(req: Request, res: Response): Promise<void>;
    private static validarDatosContraPago;
}
export declare const obtenerHistorialValidacionesAdmin: (req: Request, res: Response) => Promise<void>;
export declare const obtenerImagenValidacionAdmin: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=validacionOCRController.d.ts.map