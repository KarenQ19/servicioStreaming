import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { carritoService } from '../services/carritoService';
import type { Carrito, ResumenCarrito, CarritoItem } from '../services/carritoService';
import { useAuth } from '../hooks/useAuth';

// Tipos
interface CarritoState {
  carrito: Carrito | null;
  resumen: ResumenCarrito | null;
  loading: boolean;
  error: string | null;
}

type CarritoAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CARRITO'; payload: { carrito: Carrito; resumen: ResumenCarrito } }
  | { type: 'ADD_ITEM'; payload: CarritoItem }
  | { type: 'UPDATE_ITEM'; payload: CarritoItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'CLEAR_CARRITO' };

interface CarritoContextType {
  state: CarritoState;
  obtenerCarrito: () => Promise<void>;
  agregarItem: (servicioId: string, cantidad?: number) => Promise<boolean>;
  actualizarItem: (itemId: string, cantidad: number) => Promise<boolean>;
  eliminarItem: (itemId: string) => Promise<boolean>;
  vaciarCarrito: () => Promise<boolean>;
}

// Estado inicial
const initialState: CarritoState = {
  carrito: null,
  resumen: null,
  loading: false,
  error: null
};

// Reducer
const carritoReducer = (state: CarritoState, action: CarritoAction): CarritoState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_CARRITO':
      return {
        ...state,
        carrito: action.payload.carrito,
        resumen: action.payload.resumen,
        loading: false,
        error: null
      };
    
    case 'ADD_ITEM':
      if (!state.carrito) return state;
      
      // Verificar si el item ya existe
      const existingItemIndex = state.carrito.items.findIndex(
        item => item.servicio.id === action.payload.servicio.id
      );
      
      let updatedItems;
      if (existingItemIndex >= 0) {
        // Actualizar item existente
        updatedItems = [...state.carrito.items];
        updatedItems[existingItemIndex] = action.payload;
      } else {
        // Agregar nuevo item
        updatedItems = [...state.carrito.items, action.payload];
      }
      
      const updatedCarrito = { ...state.carrito, items: updatedItems };
      const updatedResumen = calcularResumen(updatedItems);
      
      return {
        ...state,
        carrito: updatedCarrito,
        resumen: updatedResumen
      };
    
    case 'UPDATE_ITEM':
      if (!state.carrito) return state;
      
      const itemsActualizados = state.carrito.items.map(item =>
        item.id === action.payload.id ? action.payload : item
      );
      
      const carritoActualizado = { ...state.carrito, items: itemsActualizados };
      const resumenActualizado = calcularResumen(itemsActualizados);
      
      return {
        ...state,
        carrito: carritoActualizado,
        resumen: resumenActualizado
      };
    
    case 'REMOVE_ITEM':
      if (!state.carrito) return state;
      
      const itemsFiltrados = state.carrito.items.filter(item => item.id !== action.payload);
      const carritoFiltrado = { ...state.carrito, items: itemsFiltrados };
      const resumenFiltrado = calcularResumen(itemsFiltrados);
      
      return {
        ...state,
        carrito: carritoFiltrado,
        resumen: resumenFiltrado
      };
    
    case 'CLEAR_CARRITO':
      return {
        ...state,
        carrito: state.carrito ? { ...state.carrito, items: [] } : null,
        resumen: { cantidadItems: 0, subtotal: '0.00', total: '0.00' }
      };
    
    default:
      return state;
  }
};

// Función auxiliar para calcular resumen
const calcularResumen = (items: CarritoItem[]): ResumenCarrito => {
  const subtotal = items.reduce((sum, item) => {
    return sum + (parseFloat(item.precio.toString()) * item.cantidad);
  }, 0);
  
  return {
    cantidadItems: items.length,
    subtotal: subtotal.toFixed(2),
    total: subtotal.toFixed(2)
  };
};

// Contexto
const CarritoContext = createContext<CarritoContextType | undefined>(undefined);

// Provider
export const CarritoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(carritoReducer, initialState);
  const { user } = useAuth();

  // Obtener carrito
  const obtenerCarrito = async () => {
    if (!user) return;
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await carritoService.obtenerCarrito();
      
      if (response.success) {
        dispatch({
          type: 'SET_CARRITO',
          payload: {
            carrito: response.data.carrito,
            resumen: response.data.resumen
          }
        });
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'Error al obtener el carrito' });
      }
    } catch (error) {
      console.error('Error al obtener carrito:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error al obtener el carrito' });
    }
  };

  // Agregar item
  const agregarItem = async (servicioId: string, cantidad: number = 1): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await carritoService.agregarItem(servicioId, cantidad);
      
      if (response.success && response.data) {
        dispatch({ type: 'ADD_ITEM', payload: response.data });
        dispatch({ type: 'SET_LOADING', payload: false });
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.message || 'Error al agregar item' });
        return false;
      }
    } catch (error) {
      console.error('Error al agregar item:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error al agregar item al carrito' });
      return false;
    }
  };

  // Actualizar item
  const actualizarItem = async (itemId: string, cantidad: number): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await carritoService.actualizarItem(itemId, cantidad);
      
      if (response.success && response.data) {
        dispatch({ type: 'UPDATE_ITEM', payload: response.data });
        dispatch({ type: 'SET_LOADING', payload: false });
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.message || 'Error al actualizar item' });
        return false;
      }
    } catch (error) {
      console.error('Error al actualizar item:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error al actualizar item' });
      return false;
    }
  };

  // Eliminar item
  const eliminarItem = async (itemId: string): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await carritoService.eliminarItem(itemId);
      
      if (response.success) {
        dispatch({ type: 'REMOVE_ITEM', payload: itemId });
        dispatch({ type: 'SET_LOADING', payload: false });
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.message || 'Error al eliminar item' });
        return false;
      }
    } catch (error) {
      console.error('Error al eliminar item:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error al eliminar item' });
      return false;
    }
  };

  // Vaciar carrito
  const vaciarCarrito = async (): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await carritoService.vaciarCarrito();
      
      if (response.success) {
        dispatch({ type: 'CLEAR_CARRITO' });
        dispatch({ type: 'SET_LOADING', payload: false });
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.message || 'Error al vaciar carrito' });
        return false;
      }
    } catch (error) {
      console.error('Error al vaciar carrito:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error al vaciar carrito' });
      return false;
    }
  };

  // Cargar carrito cuando el usuario se autentica
  useEffect(() => {
    if (user && user.role === 'CLIENTE') {
      obtenerCarrito();
    } else {
      // Limpiar carrito cuando el usuario se desautentica o es administrador
      dispatch({ type: 'CLEAR_CARRITO' });
    }
  }, [user]);

  const value: CarritoContextType = {
    state,
    obtenerCarrito,
    agregarItem,
    actualizarItem,
    eliminarItem,
    vaciarCarrito
  };

  return (
    <CarritoContext.Provider value={value}>
      {children}
    </CarritoContext.Provider>
  );
};

// Hook personalizado
export const useCarrito = (): CarritoContextType => {
  const context = useContext(CarritoContext);
  if (context === undefined) {
    throw new Error('useCarrito debe ser usado dentro de un CarritoProvider');
  }
  return context;
};