import { prisma } from '../utils/database';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { LoginCredenciales, RegistroCliente, AuthResponse } from '../types';

export class AuthService {
  // Client registration
  static async registerClient(data: RegistroCliente): Promise<AuthResponse> {
    // Check if email already exists
    const existingClient = await prisma.cliente.findUnique({
      where: { email: data.email },
    });

    if (existingClient) {
      throw new Error('Email already registered');
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create client
    const client = await prisma.cliente.create({
      data: {
        nombre: data.nombre,
        email: data.email,
        password: hashedPassword,
        telefono: data.telefono,
      },
    });

    // Generate token
    const token = generateToken({
      userId: client.id,
      email: client.email,
      role: 'CLIENTE',
    });

    return {
      success: true,
      token,
      user: {
        id: client.id,
        email: client.email,
        nombre: client.nombre,
        role: 'CLIENTE',
      },
    };
  }

  // Client login
  static async loginClient(credentials: LoginCredenciales): Promise<AuthResponse> {
    // Find client
    const client = await prisma.cliente.findUnique({
      where: { email: credentials.email },
    });

    if (!client) {
      throw new Error('Invalid email or password');
    }

    // Check if client is active
    if (!client.activo) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isValidPassword = await comparePassword(credentials.password, client.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = generateToken({
      userId: client.id,
      email: client.email,
      role: 'CLIENTE',
    });

    return {
      success: true,
      token,
      user: {
        id: client.id,
        email: client.email,
        nombre: client.nombre,
        role: 'CLIENTE',
      },
    };
  }

  // Admin login
  static async loginAdmin(credentials: LoginCredenciales): Promise<AuthResponse> {
    // Find admin
    const admin = await prisma.administrador.findUnique({
      where: { email: credentials.email },
    });

    if (!admin) {
      throw new Error('Invalid email or password');
    }

    // Check if admin is active
    if (!admin.activo) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isValidPassword = await comparePassword(credentials.password, admin.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = generateToken({
      userId: admin.id,
      email: admin.email,
      role: 'ADMINISTRADOR',
    });

    return {
      success: true,
      token,
      user: {
        id: admin.id,
        email: admin.email,
        nombre: admin.nombre,
        role: 'ADMINISTRADOR',
      },
    };
  }

  // Get user profile by ID and role
  static async getUserProfile(userId: string, role: 'CLIENTE' | 'ADMINISTRADOR') {
    if (role === 'CLIENTE') {
      const client = await prisma.cliente.findUnique({
        where: { id: userId },
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

      if (!client) {
        throw new Error('Client not found');
      }

      return { ...client, role: 'CLIENTE' };
    } else {
      const admin = await prisma.administrador.findUnique({
        where: { id: userId },
        select: {
          id: true,
          nombre: true,
          email: true,
          activo: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!admin) {
        throw new Error('Administrator not found');
      }

      return { ...admin, role: 'ADMINISTRADOR' };
    }
  }
}