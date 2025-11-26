import { JWTPayload } from './index';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      nombre: string;
      role: 'CLIENTE' | 'ADMINISTRADOR';
      googleId?: string;
      facebookId?: string;
      proveedor?: 'LOCAL' | 'GOOGLE' | 'FACEBOOK';
      avatar?: string;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};