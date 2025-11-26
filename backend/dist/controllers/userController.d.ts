import { Request, Response } from 'express';
export declare class UserController {
    static updateProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getDetailedProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static deactivateAccount(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getAllClients(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static reactivateClient(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=userController.d.ts.map