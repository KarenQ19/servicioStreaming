import { Request, Response } from 'express';
type TransferData = {
    titular?: string;
    documento?: string;
    banco?: string;
    tipoCuenta?: string;
    numeroCuenta?: string;
    correo?: string;
};
type PaymentSettings = {
    qrImagePath?: string | null;
    transferencia?: TransferData;
};
export declare const loadPaymentSettings: () => Promise<PaymentSettings>;
export declare const paymentConfigController: {
    getConfig: (_req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    updateTransferData: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    uploadQrImage: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
};
export {};
//# sourceMappingURL=paymentConfigController.d.ts.map