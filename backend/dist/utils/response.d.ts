import { Response } from 'express';
export declare const sendSuccess: <T>(res: Response, data: T, message?: string, statusCode?: number) => Response;
export declare const sendError: (res: Response, error: string, statusCode?: number, data?: any) => Response;
export declare const sendCreated: <T>(res: Response, data: T, message?: string) => Response;
export declare const sendNoContent: (res: Response) => Response;
//# sourceMappingURL=response.d.ts.map