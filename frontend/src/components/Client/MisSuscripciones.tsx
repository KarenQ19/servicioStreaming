import { useState, useEffect } from 'react';
import { suscripcionService, type Suscripcion } from '../../services/suscripcionService';
import { EyeIcon, EyeSlashIcon, CalendarIcon, CreditCardIcon, KeyIcon } from '@heroicons/react/24/outline';
import { getServicioLogo } from '../../utils/serviceLogos';

interface MisSuscripcionesProps {
  className?: string;
}

export default function MisSuscripciones({ className = '' }: MisSuscripcionesProps) {
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [credencialesVisibles, setCredencialesVisibles] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    cargarSuscripciones();
  }, []);

  const cargarSuscripciones = async () => {
    try {
      setLoading(true);
      const response = await suscripcionService.obtenerSuscripciones(1, 50, 'activa');
      setSuscripciones(response.suscripciones || []);
    } catch (err) {
      console.error('Error al cargar suscripciones:', err);
      setError('Error al cargar las suscripciones');
      setSuscripciones([]); // Asegurar que siempre sea un array
    } finally {
      setLoading(false);
    }
  };

  const toggleCredencialesVisibilidad = (suscripcionId: number) => {
    setCredencialesVisibles(prev => ({
      ...prev,
      [suscripcionId]: !prev[suscripcionId]
    }));
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const obtenerColorEstado = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'activa':
        return 'bg-green-100 text-green-800';
      case 'pausada':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelada':
        return 'bg-red-100 text-red-800';
      case 'vencida':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const obtenerIconoServicio = (nombre: string) => {
    const inicial = nombre.charAt(0).toUpperCase();
    const colores = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500',
      'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500'
    ];
    const colorIndex = nombre.length % colores.length;
    return { inicial, color: colores[colorIndex] };
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Mis Suscripciones</h2>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-300 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/3"></div>
                </div>
                <div className="h-6 bg-gray-300 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Mis Suscripciones</h2>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <div className="text-red-500 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={cargarSuscripciones}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!suscripciones || suscripciones.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Mis Suscripciones</h2>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes suscripciones activas</h3>
            <p className="text-gray-600 mb-4">Explora nuestro catálogo y encuentra el servicio perfecto para ti</p>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Explorar Servicios
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Mis Suscripciones</h2>
        <p className="text-sm text-gray-600 mt-1">
          {(suscripciones || []).length} suscripción{(suscripciones || []).length !== 1 ? 'es' : ''} activa{(suscripciones || []).length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="p-6">
        <div className="space-y-6">
          {suscripciones.map((suscripcion) => {
            const icono = obtenerIconoServicio(suscripcion.servicio.nombre);
            const credencialesVisible = credencialesVisibles[suscripcion.id] || false;
            
            return (
              <div
                key={suscripcion.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition transform hover:-translate-y-0.5 bg-white"
              >
                {/* Header de la suscripción */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-lg border border-gray-100 bg-gray-50 overflow-hidden flex items-center justify-center">
                      <img
                        src={getServicioLogo(
                          suscripcion.servicio.nombre,
                          (suscripcion.servicio as any).logoUrl || (suscripcion.servicio as any).logo_url,
                          (suscripcion.servicio as any).imagen
                        )}
                        alt={suscripcion.servicio.nombre}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          const fallback = getServicioLogo(suscripcion.servicio.nombre);
                          e.currentTarget.src = fallback;
                        }}
                      />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">{suscripcion.servicio.nombre}</h3>
                      <p className="text-sm text-gray-600">{suscripcion.servicio.categoria}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      ${Math.round(suscripcion.servicio?.precio ?? suscripcion.precio ?? 0)}/mes
                    </p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${obtenerColorEstado(suscripcion.estado)}`}>
                      {suscripcion.estado}
                    </span>
                  </div>
              </div>

                {/* Información de fechas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    <span>Inicio: {formatearFecha(suscripcion.fechaInicio)}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    <span>Renovación: {formatearFecha(suscripcion.fechaFin)}</span>
                  </div>
                </div>

                {/* Credenciales */}
                {suscripcion.credenciales && Array.isArray(suscripcion.credenciales) && suscripcion.credenciales.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <KeyIcon className="w-5 h-5 text-gray-600 mr-2" />
                        <h4 className="text-sm font-medium text-gray-900">Credenciales de Acceso</h4>
                      </div>
                      <button
                        onClick={() => toggleCredencialesVisibilidad(suscripcion.id)}
                        className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                      >
                        {credencialesVisible ? (
                          <>
                            <EyeSlashIcon className="w-4 h-4 mr-1" />
                            Ocultar
                          </>
                        ) : (
                          <>
                            <EyeIcon className="w-4 h-4 mr-1" />
                            Mostrar
                          </>
                        )}
                      </button>
                    </div>
                    
                    {suscripcion.credenciales && Array.isArray(suscripcion.credenciales) && suscripcion.credenciales.map((credencial, index) => (
                      <div key={credencial.id} className={`${index > 0 ? 'mt-4 pt-4 border-t border-gray-200' : ''}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Usuario</label>
                            <div className="bg-white border border-gray-200 rounded px-3 py-2 text-sm">
                              {credencialesVisible ? credencial.usuario : '••••••••'}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Contraseña</label>
                            <div className="bg-white border border-gray-200 rounded px-3 py-2 text-sm">
                              {credencialesVisible ? credencial.password : '••••••••'}
                            </div>
                          </div>
                        </div>

                        {credencial.urlAcceso && (
                          <div className="mt-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">URL de Acceso</label>
                            <div className="bg-white border border-gray-200 rounded px-3 py-2 text-sm">
                              {credencialesVisible ? (
                                <a 
                                  href={credencial.urlAcceso} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 underline"
                                >
                                  {credencial.urlAcceso}
                                </a>
                              ) : (
                                '••••••••••••••••••••'
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Información de pago */}
                {suscripcion.pago && (
                  <div className="flex items-center text-sm text-gray-600">
                    <CreditCardIcon className="w-4 h-4 mr-2" />
                    <span>Último pago: ${suscripcion.pago.monto} - {formatearFecha(suscripcion.pago.fechaPago)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={() => window.location.href = '/catalogo'}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Explorar Más Servicios
          </button>
        </div>
      </div>
    </div>
  );
}
