import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { sendSuccess, sendError } from '../utils/response';
import { LoginCredenciales, RegistroCliente } from '../types';

export class AuthController {
  // POST /api/v1/auth/register
  static async register(req: Request, res: Response) {
    try {
      const data: RegistroCliente = req.body;
      const result = await AuthService.registerClient(data);
      
      return sendSuccess(res, result, 'Client registered successfully', 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      return sendError(res, message, 400);
    }
  }

  // POST /api/v1/auth/login
  static async loginClient(req: Request, res: Response) {
    try {
      const credentials: LoginCredenciales = req.body;
      const result = await AuthService.loginClient(credentials);
      
      return sendSuccess(res, result, 'Login successful');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      return sendError(res, message, 401);
    }
  }

  // POST /api/v1/auth/admin/login
  static async loginAdmin(req: Request, res: Response) {
    try {
      const credentials: LoginCredenciales = req.body;
      const result = await AuthService.loginAdmin(credentials);
      
      return sendSuccess(res, result, 'Admin login successful');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Admin login failed';
      return sendError(res, message, 401);
    }
  }

  // POST /api/v1/auth/logout
  static async logout(req: Request, res: Response) {
    try {
      // In a JWT-based system, logout is typically handled client-side
      // by removing the token from storage. However, we can implement
      // token blacklisting here if needed in the future.
      
      return sendSuccess(res, null, 'Logout successful');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logout failed';
      return sendError(res, message, 400);
    }
  }

  // GET /api/v1/auth/profile
  static async getProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'User not authenticated', 401);
      }

      const profile = await AuthService.getUserProfile((req.user as any).id, (req.user as any).role);
      
      return sendSuccess(res, profile, 'Profile retrieved successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get profile';
      return sendError(res, message, 400);
    }
  }

  // GET /api/v1/auth/verify
  static async verifyToken(req: Request, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Token is invalid', 401);
      }

      return sendSuccess(res, {
        valid: true,
        user: {
          id: (req.user as any).id,
          email: (req.user as any).email,
          role: (req.user as any).role,
        },
      }, 'Token is valid');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token verification failed';
      return sendError(res, message, 401);
    }
  }
}