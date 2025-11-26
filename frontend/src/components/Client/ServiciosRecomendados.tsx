import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getServicioLogo } from '../../utils/serviceLogos';

interface Servicio {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen?: string;
  logoUrl?: string;
}

interface ServiciosRecomendadosProps {
  servicios: Servicio[];
  isLoading: boolean;
}

const ServiciosRecomendados: React.FC<ServiciosRecomendadosProps> = ({ servicios, isLoading }) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Servicios Recomendados</h2>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded-md"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!servicios || servicios.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Servicios Recomendados</h2>
        <p className="text-gray-500">No hay recomendaciones disponibles en este momento.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <h2 className="text-lg font-semibold mb-4">Servicios Recomendados</h2>
      <div className="space-y-4">
        {servicios.slice(0, 3).map((servicio) => (
          <div 
            key={servicio.id} 
            className="flex items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer"
            onClick={() => navigate(`/servicios/${servicio.id}`)}
          >
            <div className="flex-shrink-0">
              <img 
                src={getServicioLogo(
                  servicio.nombre,
                  servicio.imagen || (servicio as any).logo || (servicio as any).logo_url,
                  servicio.logoUrl
                )} 
                alt={servicio.nombre} 
                className="w-12 h-12 rounded-md object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getServicioLogo(servicio.nombre);
                }}
              />
            </div>
            <div className="ml-4 flex-1">
              <h3 className="font-medium text-gray-900">{servicio.nombre}</h3>
              <p className="text-sm text-gray-500 line-clamp-1">{servicio.descripcion}</p>
            </div>
            <div className="ml-2">
              <span className="text-sm font-medium text-gray-900">${servicio.precio.toFixed(2)}/mes</span>
            </div>
          </div>
        ))}
        
        {servicios.length > 3 && (
          <button 
            onClick={() => navigate('/servicios')}
            className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Ver más servicios
          </button>
        )}
      </div>
    </div>
  );
};

export default ServiciosRecomendados;
