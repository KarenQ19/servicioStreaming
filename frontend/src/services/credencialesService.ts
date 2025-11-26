import { api } from './api';

export interface Credencial {
  id: string;
  usuario: string;
  password: string;
  urlAcceso?: string;
  notas?: string;
  activas: boolean;
  asignadas: boolean;
  createdAt: string;
  updatedAt: string;
  servicio: {
    id: string;
    nombre: string;
    descripcion: string;
    categoria: string;
  };
  suscripcion: {
    id: string;
    estado: string;
    fechaInicio: string;
    fechaFin: string;
  };
}

export interface CredencialesResponse {
  success: boolean;
  data: Credencial[];
}

class CredencialesService {
  // Obtener las credenciales del cliente autenticado
  async obtenerMisCredenciales(): Promise<Credencial[]> {
    try {
      const response = await api.get<CredencialesResponse>('/credenciales/mis-credenciales');
      return response.data.data;
    } catch (error) {
      console.error('Error al obtener credenciales:', error);
      throw error;
    }
  }

  // Formatear fecha para mostrar
  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Verificar si una suscripción está activa
  esSuscripcionActiva(suscripcion: Credencial['suscripcion']): boolean {
    const fechaFin = new Date(suscripcion.fechaFin);
    const ahora = new Date();
    return suscripcion.estado === 'ACTIVA' && fechaFin > ahora;
  }

  // Obtener el estado de la suscripción con color
  obtenerEstadoSuscripcion(suscripcion: Credencial['suscripcion']): { texto: string; color: string } {
    const fechaFin = new Date(suscripcion.fechaFin);
    const ahora = new Date();
    
    if (suscripcion.estado === 'ACTIVA' && fechaFin > ahora) {
      return { texto: 'Activa', color: 'text-green-600' };
    } else if (suscripcion.estado === 'ACTIVA' && fechaFin <= ahora) {
      return { texto: 'Expirada', color: 'text-red-600' };
    } else if (suscripcion.estado === 'PAUSADA') {
      return { texto: 'Pausada', color: 'text-yellow-600' };
    } else if (suscripcion.estado === 'CANCELADA') {
      return { texto: 'Cancelada', color: 'text-gray-600' };
    } else {
      return { texto: 'Inactiva', color: 'text-gray-600' };
    }
  }

  // Agrupar credenciales por categoría
  agruparPorCategoria(credenciales: Credencial[]): Record<string, Credencial[]> {
    return credenciales.reduce((grupos, credencial) => {
      const categoria = credencial.servicio.categoria;
      if (!grupos[categoria]) {
        grupos[categoria] = [];
      }
      grupos[categoria].push(credencial);
      return grupos;
    }, {} as Record<string, Credencial[]>);
  }
}

export default new CredencialesService();