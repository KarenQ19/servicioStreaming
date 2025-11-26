import React, { useState } from 'react';
import { useCarrito } from '../../context/CarritoContext';
import CheckoutModal from './CheckoutModal';
import './CarritoDrawer.css';

interface CarritoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CarritoDrawer: React.FC<CarritoDrawerProps> = ({ isOpen, onClose }) => {
  const { state, actualizarItem, eliminarItem, vaciarCarrito } = useCarrito();
  const [showCheckout, setShowCheckout] = useState(false);

  const handleActualizarCantidad = async (itemId: string, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) return;
    
    const success = await actualizarItem(itemId, nuevaCantidad);
    if (!success) {
      alert('No se pudo actualizar la cantidad');
    }
  };

  const handleEliminarItem = async (itemId: string) => {
    const success = await eliminarItem(itemId);
    if (success) {
      alert('Item eliminado del carrito');
    } else {
      alert('No se pudo eliminar el item');
    }
  };

  const handleVaciarCarrito = async () => {
    if (window.confirm('¿Estás seguro de que quieres vaciar el carrito?')) {
      const success = await vaciarCarrito();
      if (success) {
        alert('Carrito vaciado');
      } else {
        alert('No se pudo vaciar el carrito');
      }
    }
  };

  const handleProcederSuscripcion = () => {
    setShowCheckout(true);
  };

  const { carrito, resumen, loading, error } = state;

  if (!isOpen) return null;

  return (
    <div className="carrito-drawer-overlay" onClick={onClose}>
      <div className="carrito-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="carrito-header">
          <h2>Carrito de Compras</h2>
          {resumen && (
            <span className="items-badge">{resumen.cantidadItems} items</span>
          )}
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="carrito-body">
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Cargando carrito...</p>
            </div>
          )}

          {error && (
            <div className="error-alert">
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && (!carrito || carrito.items.length === 0) && (
            <div className="empty-state">
              <p>Tu carrito está vacío</p>
              <small>Agrega algunos servicios para comenzar</small>
            </div>
          )}

          {!loading && !error && carrito && carrito.items.length > 0 && (
            <div className="carrito-items">
              {carrito.items.map((item) => (
                <div key={item.id} className="carrito-item">
                  <div className="item-info">
                    <div className="service-placeholder">
                      {item.servicio.nombre.charAt(0)}
                    </div>
                    
                    <div className="item-details">
                      <h4>{item.servicio.nombre}</h4>
                      <p className="category">{item.servicio.categoria}</p>
                      <p className="price">${item.precio}/mes</p>
                    </div>
                  </div>

                  <div className="item-controls">
                    <div className="quantity-controls">
                      <button
                        onClick={() => handleActualizarCantidad(item.id, item.cantidad - 1)}
                        disabled={item.cantidad <= 1 || loading}
                        className="qty-btn"
                      >
                        -
                      </button>
                      <span className="quantity">{item.cantidad}</span>
                      <button
                        onClick={() => handleActualizarCantidad(item.id, item.cantidad + 1)}
                        disabled={loading}
                        className="qty-btn"
                      >
                        +
                      </button>
                    </div>
                    
                    <button
                      onClick={() => handleEliminarItem(item.id)}
                      disabled={loading}
                      className="delete-btn"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}

              <div className="carrito-divider"></div>

              {resumen && (
                <div className="carrito-summary">
                  <div className="summary-row">
                    <span>Subtotal:</span>
                    <span>${resumen.subtotal}</span>
                  </div>
                  <div className="summary-row total">
                    <span>Total:</span>
                    <span>${resumen.total}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {!loading && !error && carrito && carrito.items.length > 0 && (
          <div className="carrito-footer">
            <button
              className="btn-secondary"
              onClick={handleVaciarCarrito}
              disabled={loading}
            >
              Vaciar Carrito
            </button>
            
            <button
              className="btn-primary"
              onClick={handleProcederSuscripcion}
              disabled={loading}
            >
              Proceder a Suscripción
            </button>
          </div>
        )}
      </div>

      {/* Modal de Checkout */}
      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        onSuccess={() => {
          setShowCheckout(false);
          onClose();
        }}
      />
    </div>
  );
};

export default CarritoDrawer;