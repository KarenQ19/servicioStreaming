import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Users, Key, ExternalLink, AlertCircle } from 'lucide-react';
import api from '../../services/api';

interface Credencial {
  id: string;
  usuario: string;
  password?: string;
  urlAcceso?: string;
  notas?: string;
  asignadas: boolean;
  createdAt: string;
  cliente?: {
    id: string;
    nombre: string;
    email: string;
  };
  suscripcion?: {
    id: string;
    estado: string;
    fechaInicio: string;
    fechaFin: string;
  };
}

interface Servicio {
  id: string;
  nombre: string;
  categoria: string;
}

interface Props {
  servicio: Servicio;
  onClose: () => void;
}

const CredentialsManager: React.FC<Props> = ({ servicio, onClose }) => {
  const [credencialesDisponibles, setCredencialesDisponibles] = useState<Credencial[]>([]);
  const [credencialesAsignadas, setCredencialesAsignadas] = useState<Credencial[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'disponibles' | 'asignadas'>('disponibles');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCredentials, setNewCredentials] = useState([
    { usuario: '', password: '', urlAcceso: '', notas: '' }
  ]);

  useEffect(() => {
    cargarCredenciales();
  }, [servicio.id]);

  const cargarCredenciales = async () => {
    setLoading(true);
    try {
      // Cargar credenciales disponibles
      const responseDisponibles = await api.get(`/credenciales/${servicio.id}/disponibles`);
      setCredencialesDisponibles(responseDisponibles.data.data || []);

      // Cargar credenciales asignadas
      const responseAsignadas = await api.get(`/credenciales/${servicio.id}/asignadas`);
      setCredencialesAsignadas(responseAsignadas.data.data || []);
    } catch (error) {
      console.error('Error al cargar credenciales:', error);
    } finally {
      setLoading(false);
    }
  };

  const agregarCredenciales = async () => {
    try {
      const credencialesValidas = newCredentials.filter(
        cred => cred.usuario.trim() && cred.password.trim()
      );

      if (credencialesValidas.length === 0) {
        alert('Debe agregar al menos una credencial válida');
        return;
      }

      await api.post(
        `/credenciales/${servicio.id}/pool`,
        { credenciales: credencialesValidas }
      );

      setNewCredentials([{ usuario: '', password: '', urlAcceso: '', notas: '' }]);
      setShowAddForm(false);
      cargarCredenciales();
      alert('Credenciales agregadas exitosamente');
    } catch (error) {
      console.error('Error al agregar credenciales:', error);
      alert('Error al agregar credenciales');
    }
  };

  const eliminarCredencial = async (credencialId: string) => {
    if (!confirm('¿Está seguro de eliminar esta credencial?')) return;

    try {
      await api.delete(`/credenciales/${credencialId}`);
      cargarCredenciales();
      alert('Credencial eliminada exitosamente');
    } catch (error) {
      console.error('Error al eliminar credencial:', error);
      alert('Error al eliminar credencial');
    }
  };

  const agregarNuevaCredencial = () => {
    setNewCredentials([
      ...newCredentials,
      { usuario: '', password: '', urlAcceso: '', notas: '' }
    ]);
  };

  const actualizarCredencial = (index: number, field: string, value: string) => {
    const updated = [...newCredentials];
    updated[index] = { ...updated[index], [field]: value };
    setNewCredentials(updated);
  };

  const eliminarNuevaCredencial = (index: number) => {
    if (newCredentials.length > 1) {
      setNewCredentials(newCredentials.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Gestión de Credenciales</h2>
              <p className="text-blue-100">{servicio.nombre} - {servicio.categoria}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('disponibles')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'disponibles'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Key className="inline w-4 h-4 mr-2" />
              Disponibles ({credencialesDisponibles.length})
            </button>
            <button
              onClick={() => setActiveTab('asignadas')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'asignadas'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="inline w-4 h-4 mr-2" />
              Asignadas ({credencialesAsignadas.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {activeTab === 'disponibles' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold">Credenciales Disponibles</h3>
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Credenciales
                    </button>
                  </div>

                  {credencialesDisponibles.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p>No hay credenciales disponibles</p>
                      <p className="text-sm">Agregue credenciales para que se asignen automáticamente</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {credencialesDisponibles.map((cred) => (
                        <div key={cred.id} className="border rounded-lg p-4 bg-green-50 border-green-200">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-gray-600">Usuario:</label>
                                  <p className="font-mono text-sm">{cred.usuario}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-600">Contraseña:</label>
                                  <p className="font-mono text-sm">••••••••</p>
                                </div>
                              </div>
                              {cred.urlAcceso && (
                                <div className="mt-2">
                                  <label className="text-sm font-medium text-gray-600">URL de Acceso:</label>
                                  <a 
                                    href={cred.urlAcceso} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                                  >
                                    {cred.urlAcceso}
                                    <ExternalLink className="w-3 h-3 ml-1" />
                                  </a>
                                </div>
                              )}
                              {cred.notas && (
                                <div className="mt-2">
                                  <label className="text-sm font-medium text-gray-600">Notas:</label>
                                  <p className="text-sm text-gray-700">{cred.notas}</p>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => eliminarCredencial(cred.id)}
                              className="text-red-600 hover:text-red-800 ml-4"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'asignadas' && (
                <div>
                  <h3 className="text-lg font-semibold mb-6">Credenciales Asignadas</h3>
                  
                  {credencialesAsignadas.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p>No hay credenciales asignadas</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {credencialesAsignadas.map((cred) => (
                        <div key={cred.id} className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-600">Usuario:</label>
                              <p className="font-mono text-sm">{cred.usuario}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">Cliente:</label>
                              <p className="text-sm">{cred.cliente?.nombre}</p>
                              <p className="text-xs text-gray-500">{cred.cliente?.email}</p>
                            </div>
                          </div>
                          {cred.suscripcion && (
                            <div className="mt-2 grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-gray-600">Estado:</label>
                                <span className={`inline-block px-2 py-1 rounded text-xs ${
                                  cred.suscripcion.estado === 'ACTIVA' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {cred.suscripcion.estado}
                                </span>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-600">Vigencia:</label>
                                <p className="text-sm">
                                  {new Date(cred.suscripcion.fechaFin).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Add Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
              <div className="bg-blue-600 text-white p-4">
                <h3 className="text-lg font-semibold">Agregar Credenciales</h3>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {newCredentials.map((cred, index) => (
                  <div key={index} className="border rounded-lg p-4 mb-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium">Credencial {index + 1}</h4>
                      {newCredentials.length > 1 && (
                        <button
                          onClick={() => eliminarNuevaCredencial(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Usuario *
                        </label>
                        <input
                          type="text"
                          value={cred.usuario}
                          onChange={(e) => actualizarCredencial(index, 'usuario', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="usuario@servicio.com"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contraseña *
                        </label>
                        <input
                          type="text"
                          value={cred.password}
                          onChange={(e) => actualizarCredencial(index, 'password', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="contraseña123"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        URL de Acceso
                      </label>
                      <input
                        type="url"
                        value={cred.urlAcceso}
                        onChange={(e) => actualizarCredencial(index, 'urlAcceso', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://netflix.com"
                      />
                    </div>
                    
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notas
                      </label>
                      <textarea
                        value={cred.notas}
                        onChange={(e) => actualizarCredencial(index, 'notas', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={2}
                        placeholder="Notas adicionales..."
                      />
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={agregarNuevaCredencial}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-500 hover:border-blue-500 hover:text-blue-500 flex items-center justify-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar otra credencial
                </button>
              </div>
              
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={agregarCredenciales}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Guardar Credenciales
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CredentialsManager;