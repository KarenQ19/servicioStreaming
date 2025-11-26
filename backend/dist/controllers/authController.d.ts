import { Request, Response } from 'express';
export declare class AuthController {
    static register(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static loginClient(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static loginAdmin(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static logout(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static verifyToken(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=authController.d.ts.map