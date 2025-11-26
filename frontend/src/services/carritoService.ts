import api from './api';

// Interfaces
export interface CarritoItem {
  id: string;
  cantidad: number;
  precio: number;
  servicio: {
    id: string;
    nombre: string;
    descripcion: string;
    precio: number;
    categoria: string;
    disponible: boolean;
    caracteristicas?: Record<string, unknown>;
  };
}

export interface Carrito {
  id: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  items: CarritoItem[];
}

export interface ResumenCarrito {
  cantidadItems: number;
  subtotal: string;
  total: string;
}

export interface CarritoResponse {
  success: boolean;
  data: {
    carrito: Carrito;
    resumen: ResumenCarrito;
  };
}

export interface ItemResponse {
  success: boolean;
  message: string;
  data?: CarritoItem;
}

// Funciones del servicio
export const carritoService = {
  // Obtener carrito del cliente
  async obtenerCarrito(): Promise<CarritoResponse> {
    const response = await api.get('/carrito');
    return response.data;
  },

  // Agregar item al carrito
  async agregarItem(servicioId: string, cantidad: number = 1): Promise<ItemResponse> {
    const response = await api.post('/carrito/items', {
      servicioId,
      cantidad
    });
    return response.data;
  },

  // Actualizar cantidad de item
  async actualizarItem(itemId: string, cantidad: number): Promise<ItemResponse> {
    const response = await api.put(`/carrito/items/${itemId}`, {
      cantidad
    });
    return response.data;
  },

  // Eliminar item del carrito
  async eliminarItem(itemId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/carrito/items/${itemId}`);
    return response.data;
  },

  // Vaciar carrito
  async vaciarCarrito(): Promise<{ success: boolean; message: string }> {
    const response = await api.delete('/carrito');
    return response.data;
  }
};

export default carritoService;