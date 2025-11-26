import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Copy, ExternalLink, Shield, Calendar, AlertCircle } from 'lucide-react';
import credencialesService, { type Credencial } from '../services/credencialesService';

const MisCredenciales: React.FC = () => {
  const [credenciales, setCredenciales] = useState<Credencial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordsVisible, setPasswordsVisible] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    cargarCredenciales();
  }, []);

  const cargarCredenciales = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await credencialesService.obtenerMisCredenciales();
      setCredenciales(data);
    } catch (err) {
      console.error('Error al cargar credenciales:', err);
      setError('Error al cargar las credenciales. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (credencialId: string) => {
    setPasswordsVisible(prev => ({
      ...prev,
      [credencialId]: !prev[credencialId]
    }));
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const abrirUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Cargando credenciales...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-8 text-red-600">
          <AlertCircle className="h-6 w-6 mr-2" />
          <span>{error}</span>
        </div>
        <div className="text-center mt-4">
          <button
            onClick={cargarCredenciales}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (credenciales.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No tienes credenciales disponibles
          </h3>
          <p className="text-gray-600">
            Las credenciales aparecerán aquí cuando tengas suscripciones activas a servicios.
          </p>
        </div>
      </div>
    );
  }

  const credencialesPorCategoria = credencialesService.agruparPorCategoria(credenciales);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-6">
          <Shield className="h-6 w-6 text-blue-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">Mis Credenciales</h2>
        </div>

        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Información importante:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Estas credenciales son exclusivas para tu uso personal</li>
                <li>No compartas tus credenciales con terceros</li>
                <li>Si tienes problemas de acceso, contacta con soporte</li>
              </ul>
            </div>
          </div>
        </div>

        {Object.entries(credencialesPorCategoria).map(([categoria, credencialesCategoria]) => (
          <div key={categoria} className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4 capitalize">
              {categoria.replace('_', ' ')}
            </h3>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {credencialesCategoria.map((credencial) => {
                const estadoSuscripcion = credencialesService.obtenerEstadoSuscripcion(credencial.suscripcion);
                const isPasswordVisible = passwordsVisible[credencial.id];
                
                return (
                  <div
                    key={credencial.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    {/* Header del servicio */}
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900 truncate">
                        {credencial.servicio.nombre}
                      </h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${estadoSuscripcion.color} bg-opacity-10`}>
                        {estadoSuscripcion.texto}
                      </span>
                    </div>

                    {/* Información de la suscripción */}
                    <div className="flex items-center text-xs text-gray-500 mb-3">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>
                        Válida hasta: {credencialesService.formatearFecha(credencial.suscripcion.fechaFin)}
                      </span>
                    </div>

                    {/* Credenciales */}
                    <div className="space-y-3">
                      {/* Usuario */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Usuario
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={credencial.usuario}
                            readOnly
                            className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded px-2 py-1 text-gray-900"
                          />
                          <button
                            onClick={() => copyToClipboard(credencial.usuario, `usuario-${credencial.id}`)}
                            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                            title="Copiar usuario"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          {copiedField === `usuario-${credencial.id}` && (
                            <span className="text-xs text-green-600">¡Copiado!</span>
                          )}
                        </div>
                      </div>

                      {/* Contraseña */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Contraseña
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type={isPasswordVisible ? 'text' : 'password'}
                            value={credencial.password}
                            readOnly
                            className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded px-2 py-1 text-gray-900"
                          />
                          <button
                            onClick={() => togglePasswordVisibility(credencial.id)}
                            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                            title={isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          >
                            {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(credencial.password, `password-${credencial.id}`)}
                            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                            title="Copiar contraseña"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          {copiedField === `password-${credencial.id}` && (
                            <span className="text-xs text-green-600">¡Copiado!</span>
                          )}
                        </div>
                      </div>

                      {/* URL de acceso */}
                      {credencial.urlAcceso && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            URL de acceso
                          </label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={credencial.urlAcceso}
                              readOnly
                              className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded px-2 py-1 text-gray-900 truncate"
                            />
                            <button
                              onClick={() => copyToClipboard(credencial.urlAcceso!, `url-${credencial.id}`)}
                              className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                              title="Copiar URL"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => abrirUrl(credencial.urlAcceso!)}
                              className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                              title="Abrir en nueva pestaña"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </button>
                            {copiedField === `url-${credencial.id}` && (
                              <span className="text-xs text-green-600">¡Copiado!</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Notas */}
                      {credencial.notas && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Notas
                          </label>
                          <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                            {credencial.notas}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MisCredenciales;