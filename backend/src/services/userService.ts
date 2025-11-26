import { prisma } from '../utils/database';
import { hashPassword } from '../utils/auth';
import { ActualizarPerfil } from '../types';

export class UserService {
  // Update client profile
  static async updateClientProfile(userId: string, data: ActualizarPerfil) {
    const updateData: any = {};

    if (data.nombre) updateData.nombre = data.nombre;
    if (data.telefono) updateData.telefono = data.telefono;
    
    // If password is provided, hash it
    if (data.password) {
      updateData.password = await hashPassword(data.password);
    }

    const updatedClient = await prisma.cliente.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { ...updatedClient, role: 'CLIENTE' };
  }

  // Update admin profile
  static async updateAdminProfile(userId: string, data: ActualizarPerfil) {
    const updateData: any = {};

    if (data.nombre) updateData.nombre = data.nombre;
    
    // If password is provided, hash it
    if (data.password) {
      updateData.password = await hashPassword(data.password);
    }

    const updatedAdmin = await prisma.administrador.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        nombre: true,
        email: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { ...updatedAdmin, role: 'ADMINISTRADOR' };
  }

  // Get client with subscriptions
  static async getClientWithSubscriptions(userId: string) {
    const client = await prisma.cliente.findUnique({
      where: { id: userId },
      include: {
        suscripciones: {
          include: {
            servicio: {
              select: {
                id: true,
                nombre: true,
                descripcion: true,
                precio: true,
                categoria: true,
                disponible: true,
              },
            },
          },
        },
        carritos: {
          include: {
            items: {
              include: {
                servicio: {
                  select: {
                    id: true,
                    nombre: true,
                    precio: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!client) {
      throw new Error('Client not found');
    }

    return client;
  }

  // Deactivate client account
  static async deactivateClient(userId: string) {
    const client = await prisma.cliente.update({
      where: { id: userId },
      data: { activo: false },
      select: {
        id: true,
        nombre: true,
        email: true,
        activo: true,
      },
    });

    return client;
  }

  // Reactivate client account (admin only)
  static async reactivateClient(userId: string) {
    const client = await prisma.cliente.update({
      where: { id: userId },
      data: { activo: true },
      select: {
        id: true,
        nombre: true,
        email: true,
        activo: true,
      },
    });

    return client;
  }

  // Get all clients (admin only)
  static async getAllClients(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [clients, total] = await Promise.all([
      prisma.cliente.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          nombre: true,
          email: true,
          telefono: true,
          activo: true,
          createdAt: true,
          _count: {
            select: {
              suscripciones: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.cliente.count(),
    ]);

    return {
      clients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}