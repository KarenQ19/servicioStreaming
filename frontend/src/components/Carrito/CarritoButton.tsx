import React, { useState } from 'react';
import { useCarrito } from '../../context/CarritoContext';
import CarritoDrawer from './CarritoDrawer';
import './CarritoButton.css';

const CarritoButton: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { state } = useCarrito();

  const handleOpenDrawer = () => {
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  const { resumen } = state;
  const itemCount = resumen?.cantidadItems || 0;

  return (
    <>
      <button 
        className="carrito-button" 
        onClick={handleOpenDrawer}
        aria-label={`Carrito de compras - ${itemCount} items`}
      >
        <div className="carrito-icon">
          🛒
        </div>
        {itemCount > 0 && (
          <span className="carrito-badge">
            {itemCount > 99 ? '99+' : itemCount}
          </span>
        )}
      </button>

      <CarritoDrawer 
        isOpen={isDrawerOpen} 
        onClose={handleCloseDrawer} 
      />
    </>
  );
};

export default CarritoButton;