import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { sendSuccess, sendError } from '../utils/response';
import { ActualizarPerfil } from '../types';

export class UserController {
  // PUT /api/v1/users/profile
  static async updateProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'User not authenticated', 401);
      }

      const data: ActualizarPerfil = req.body;
      let updatedProfile;

      if ((req.user as any).role === 'CLIENTE') {
        updatedProfile = await UserService.updateClientProfile((req.user as any).id, data);
      } else if ((req.user as any).role === 'ADMINISTRADOR') {
        updatedProfile = await UserService.updateAdminProfile((req.user as any).id, data);
      } else {
        return sendError(res, 'Invalid user role', 400);
      }

      return sendSuccess(res, updatedProfile, 'Profile updated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      return sendError(res, message, 400);
    }
  }

  // GET /api/v1/users/profile/detailed
  static async getDetailedProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'User not authenticated', 401);
      }

      if ((req.user as any).role !== 'CLIENTE') {
        return sendError(res, 'Access denied. Only clients can access this endpoint', 403);
      }

      const profile = await UserService.getClientWithSubscriptions((req.user as any).id);
      
      return sendSuccess(res, profile, 'Detailed profile retrieved successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get detailed profile';
      return sendError(res, message, 400);
    }
  }

  // DELETE /api/v1/users/profile
  static async deactivateAccount(req: Request, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'User not authenticated', 401);
      }

      if ((req.user as any).role !== 'CLIENTE') {
        return sendError(res, 'Access denied. Only clients can deactivate their accounts', 403);
      }

      const result = await UserService.deactivateClient((req.user as any).id);
      
      return sendSuccess(res, result, 'Account deactivated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to deactivate account';
      return sendError(res, message, 400);
    }
  }

  // GET /api/v1/users (Admin only)
  static async getAllClients(req: Request, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'User not authenticated', 401);
      }

      if ((req.user as any).role !== 'ADMINISTRADOR') {
        return sendError(res, 'Access denied. Admin privileges required', 403);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await UserService.getAllClients(page, limit);
      
      return sendSuccess(res, result, 'Clients retrieved successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get clients';
      return sendError(res, message, 400);
    }
  }

  // PUT /api/v1/users/:id/reactivate (Admin only)
  static async reactivateClient(req: Request, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'User not authenticated', 401);
      }

      if ((req.user as any).role !== 'ADMINISTRADOR') {
        return sendError(res, 'Access denied. Admin privileges required', 403);
      }

      const { id } = req.params;
      const result = await UserService.reactivateClient(id);
      
      return sendSuccess(res, result, 'Client reactivated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reactivate client';
      return sendError(res, message, 400);
    }
  }
}