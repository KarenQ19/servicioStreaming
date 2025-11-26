import { Request, Response, NextFunction } from 'express';
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => void;
export declare const authorizeClient: (req: Request, res: Response, next: NextFunction) => void;
export declare const authorizeAdmin: (req: Request, res: Response, next: NextFunction) => void;
export declare const authorizeClientOrAdmin: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map