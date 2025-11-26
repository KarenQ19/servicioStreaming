import { Request, Response } from 'express';
export declare const adminController: {
    consultarCatalogo: (req: Request, res: Response) => Promise<void>;
    agregarServicio: (req: Request, res: Response) => Promise<Response | void>;
    actualizarServicio: (req: Request, res: Response) => Promise<Response | void>;
    eliminarServicio: (req: Request, res: Response) => Promise<Response | void>;
    consultarClientes: (req: Request, res: Response) => Promise<void>;
    suspenderCliente: (req: Request, res: Response) => Promise<Response | void>;
    consultarCarrito: (req: Request, res: Response) => Promise<Response | void>;
};
//# sourceMappingURL=adminController.d.ts.map