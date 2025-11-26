import api from './api';
import type { LoginCredentials, RegisterData, AuthResponse, User } from '../types';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    console.log('🔐 Intentando login con:', { email: credentials.email });
    
    try {
      // Intentar primero login de administrador
      console.log('🔑 Probando login de administrador...');
      const adminResponse = await api.post('/auth/admin/login', credentials);
      console.log('✅ Login de administrador exitoso:', adminResponse.data);
      return adminResponse.data.data;
    } catch (adminError) {
      console.log('❌ Login de administrador falló, probando cliente...');
      
      try {
        // Si falla el login de admin, intentar login de cliente
        console.log('🔑 Probando login de cliente...');
        const clientResponse = await api.post('/auth/login', credentials);
        console.log('✅ Login de cliente exitoso:', clientResponse.data);
        return clientResponse.data.data;
      } catch (clientError) {
        console.error('❌ Ambos logins fallaron:', { adminError, clientError });
        throw clientError;
      }
    }
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    console.log('📝 Registrando usuario:', { email: data.email });
    const response = await api.post('/auth/register', data);
    console.log('✅ Registro exitoso:', response.data);
    return response.data.data;
  },

  async verifyToken(): Promise<User> {
    console.log('🔍 Verificando token...');
    const response = await api.get('/auth/profile');
    console.log('✅ Token verificado:', response.data);
    return response.data.data;
  },

  logout(): void {
    console.log('👋 Cerrando sesión...');
    localStorage.removeItem('token');
  },

  async refreshToken(): Promise<AuthResponse> {
    console.log('🔄 Refrescando token...');
    const response = await api.post('/auth/refresh');
    console.log('✅ Token refrescado:', response.data);
    return response.data.data;
  },
};