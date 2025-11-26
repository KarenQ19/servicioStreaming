import api from './api';

export const clienteService = {
  obtenerPerfil: async () => {
    const response = await api.get('/cliente/perfil');
    return response.data;
  },
  
  obtenerMetricas: async () => {
    const response = await api.get('/cliente/metricas');
    return response.data;
  }
};

export default clienteService;