import { Request, Response } from 'express';
export declare const reportesController: {
    consultarReportesVentas: (req: Request, res: Response) => Promise<void>;
    consultarReportesActividad: (req: Request, res: Response) => Promise<void>;
    procesarVentasPorPeriodo: (ventas: any[], periodo: string, fechaInicio: Date, fechaFin: Date) => any[];
};
//# sourceMappingURL=reportesController.d.ts.map