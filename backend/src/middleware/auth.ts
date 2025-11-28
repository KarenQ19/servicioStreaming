import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/auth';
import { sendError } from '../utils/response';
import { JWTPayload } from '../types';

// Authentication middleware
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      sendError(res, 'Access token is required', 401);
      return;
    }

    const decoded = verifyToken(token);
    // Convert JWTPayload to Express.User format
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      nombre: '', // This will be populated from database if needed
      role: decoded.role
    } as Express.User;
    next();
  } catch (error) {
    sendError(res, 'Invalid or expired token', 401);
  }
};

// Authorization middleware for clients only
export const authorizeClient = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    sendError(res, 'Authentication required', 401);
    return;
  }

  const role = (req.user as any).role;
  if (role !== 'CLIENTE') {
    sendError(res, 'Access denied. Client role required', 403);
    return;
  }

  next();
};

// Authorization middleware for admins only
export const authorizeAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    sendError(res, 'Authentication required', 401);
    return;
  }

  if ((req.user as any).role !== 'ADMINISTRADOR') {
    sendError(res, 'Access denied. Administrator role required', 403);
    return;
  }

  next();
};

// Authorization middleware for clients or admins
export const authorizeClientOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    sendError(res, 'Authentication required', 401);
    return;
  }

  if ((req.user as any).role !== 'CLIENTE' && (req.user as any).role !== 'ADMINISTRADOR') {
    sendError(res, 'Access denied. Client or Administrator role required', 403);
    return;
  }

  next();
};
