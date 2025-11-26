import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 segundos de timeout
});

// Interceptor para agregar token automáticamente (solo para endpoints protegidos)
api.interceptors.request.use(
  (config) => {
    // Lista de endpoints que NO necesitan token
    const publicEndpoints = [
      '/auth/login',
      '/auth/register', 
      '/auth/admin/login'
    ];
    
    const isPublicEndpoint = publicEndpoints.some(endpoint => 
      config.url?.includes(endpoint)
    );
    
    if (!isPublicEndpoint) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Solo logear si no es un error de autenticación esperado
    if (error.response?.status !== 401) {
      console.error('Response interceptor error:', error);
    }
    
    // Solo redirigir si es un 401 en endpoints protegidos (no en login)
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default api;