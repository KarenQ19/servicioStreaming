import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getServicioLogo } from '../../utils/serviceLogos';
import { Sparkles } from 'lucide-react';

interface Servicio {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen?: string;
  logoUrl?: string;
  razon?: string;
}

interface ServiciosRecomendadosProps {
  servicios: Servicio[];
  isLoading: boolean;
}

const ServiciosRecomendados: React.FC<ServiciosRecomendadosProps> = ({ servicios, isLoading }) => {
  const navigate = useNavigate();
  const categorias = Array.from(new Set(servicios.map(s => s.descripcion || s.nombre || '').filter(Boolean)));
  const mensajeExplicativo = servicios.length
    ? `Te sugerimos estos servicios porque se relacionan con lo que has visto o contratado recientemente${categorias.length ? ` (ej. ${categorias.slice(0,2).join(', ')})` : ''}.`
    : '';

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-semibold mb-4">Servicios Recomendados</h2>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
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
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-semibold mb-4">Servicios Recomendados</h2>
        <p className="text-gray-500">No hay recomendaciones disponibles en este momento.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold">Servicios Recomendados</h2>
          <p className="text-xs text-gray-500">
            {mensajeExplicativo || 'Te sugerimos opciones relacionadas con tus suscripciones recientes.'}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
          <Sparkles size={12} />
          IA Smart
        </span>
      </div>
      <div className="space-y-3">
        {servicios.slice(0, 3).map((servicio) => (
          <button
            key={servicio.id}
            className="flex w-full items-center p-3 border border-gray-100 rounded-xl hover:bg-blue-50/70 hover:-translate-y-0.5 transition transform cursor-pointer text-left gap-3"
            onClick={() => navigate(`/servicio/${servicio.id}`)}
          >
            <div className="flex-shrink-0">
              <img
                src={getServicioLogo(
                  servicio.nombre,
                  servicio.imagen || (servicio as any).logo || (servicio as any).logo_url,
                  servicio.logoUrl
                )}
                alt={servicio.nombre}
                className="w-12 h-12 rounded-xl object-contain border border-gray-100 bg-gray-50"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getServicioLogo(servicio.nombre);
                }}
              />
            </div>
            <div className="ml-4 flex-1">
              <h3 className="font-medium text-gray-900">{servicio.nombre}</h3>
              <p className="text-sm text-gray-500 line-clamp-1">{servicio.descripcion}</p>
              {servicio.razon && (
                <p className="text-[11px] text-blue-600 mt-1 line-clamp-1">Recomendado porque: {servicio.razon}</p>
              )}
            </div>
            <div className="ml-2 text-right">
              <span className="text-sm font-semibold text-gray-900">${Math.round(servicio.precio)}</span>
              <p className="text-[11px] text-gray-500">/mes</p>
            </div>
          </button>
        ))}

        <button
          onClick={() => navigate('/catalogo')}
          className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 font-medium bg-blue-50 rounded-lg"
        >
          Ver más servicios
        </button>
      </div>
    </div>
  );
};

export default ServiciosRecomendados;
