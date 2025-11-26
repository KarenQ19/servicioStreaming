import React, { useState, useEffect } from 'react';
import { adminService, type ServicioAdmin, type CrearServicioData, type ActualizarServicioData } from '../../services/adminService';
import CredentialsManager from './CredentialsManager';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  KeyIcon
} from '@heroicons/react/24/outline';

interface ServicioFormData {
  nombre: string;
  descripcion: string;
  precio: string;
  categoria: string;
  disponible: boolean;
  logoUrl: string;
  caracteristicas: string[];
}

const AdminServices: React.FC = () => {
  const [servicios, setServicios] = useState<ServicioAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedServicio, setSelectedServicio] = useState<ServicioAdmin | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [servicioToDelete, setServicioToDelete] = useState<ServicioAdmin | null>(null);
  const [showCredentialsManager, setShowCredentialsManager] = useState(false);
  const [servicioForCredentials, setServicioForCredentials] = useState<ServicioAdmin | null>(null);

  // Form state
  const [formData, setFormData] = useState<ServicioFormData>({
    nombre: '',
    descripcion: '',
    precio: '',
    categoria: '',
    disponible: true,
    logoUrl: '',
    caracteristicas: []
  });
  const [newCaracteristica, setNewCaracteristica] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    loadServicios();
  }, []);

  const loadServicios = async () => {
    try {
      setLoading(true);
      setError(null);
      const catalogoData = await adminService.consultarCatalogo();
      setServicios(catalogoData.servicios);
    } catch (err) {
      setError('Error al cargar los servicios');
      console.error('Error loading services:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateService = () => {
    setModalMode('create');
    setSelectedServicio(null);
    setFormData({
      nombre: '',
      descripcion: '',
      precio: '',
      categoria: '',
      disponible: true,
      logoUrl: '',
      caracteristicas: []
    });
    setLogoFile(null);
    setLogoPreview(null);
    setShowModal(true);
  };

  const handleEditService = (servicio: ServicioAdmin) => {
    setModalMode('edit');
    setSelectedServicio(servicio);
    setFormData({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion,
      precio: servicio.precio.toString(),
      categoria: servicio.categoria,
      disponible: servicio.disponible,
      logoUrl: servicio.logoUrl || servicio.imagen || '',
      caracteristicas: Array.isArray(servicio.caracteristicas) ? servicio.caracteristicas : []
    });
    setLogoFile(null);
    setLogoPreview(servicio.logoUrl || servicio.imagen || null);
    setShowModal(true);
  };

  const handleViewService = (servicio: ServicioAdmin) => {
    setModalMode('view');
    setSelectedServicio(servicio);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleDeleteService = (servicio: ServicioAdmin) => {
    setServicioToDelete(servicio);
    setShowDeleteModal(true);
  };

  const handleManageCredentials = (servicio: ServicioAdmin) => {
    setServicioForCredentials(servicio);
    setShowCredentialsManager(true);
  };

  const confirmDelete = async () => {
    if (!servicioToDelete) return;

    try {
      setLoading(true);
      await adminService.eliminarServicio(servicioToDelete.id);
      await loadServicios();
      setShowDeleteModal(false);
      setServicioToDelete(null);
    } catch (err) {
      setError('Error al eliminar el servicio');
      console.error('Error deleting service:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      let logoUrlToSend = formData.logoUrl.trim();
      if (logoFile) {
        logoUrlToSend = await adminService.subirLogo(logoFile);
      }

      const serviceData = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        precio: parseFloat(formData.precio),
        categoria: formData.categoria,
        disponible: formData.disponible,
        logoUrl: logoUrlToSend || undefined,
        imagen: logoUrlToSend || undefined,
        logo: logoUrlToSend || undefined,
        logo_url: logoUrlToSend || undefined,
        caracteristicas: formData.caracteristicas
      };

      if (modalMode === 'create') {
        await adminService.crearServicio(serviceData as CrearServicioData);
      } else if (modalMode === 'edit' && selectedServicio) {
        await adminService.actualizarServicio(selectedServicio.id, serviceData as ActualizarServicioData);
      }

      await loadServicios();
      closeModal();
    } catch (err) {
      setError(`Error al ${modalMode === 'create' ? 'crear' : 'actualizar'} el servicio`);
      console.error('Error submitting form:', err);
    } finally {
      setLoading(false);
    }
  };

  const addCaracteristica = () => {
    if (newCaracteristica.trim() && !formData.caracteristicas.includes(newCaracteristica.trim())) {
      setFormData(prev => ({
        ...prev,
        caracteristicas: [...prev.caracteristicas, newCaracteristica.trim()]
      }));
      setNewCaracteristica('');
    }
  };

  const removeCaracteristica = (index: number) => {
    setFormData(prev => ({
      ...prev,
      caracteristicas: prev.caracteristicas.filter((_, i) => i !== index)
    }));
  };

  const handleLogoFileChange = (file: File | null) => {
    if (!file) {
      setLogoFile(null);
      setLogoPreview(formData.logoUrl || null);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('El logo debe pesar menos de 2MB');
      return;
    }
    setError(null);
    setLogoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setLogoPreview(objectUrl);
  };

  const filteredServicios = servicios.filter(servicio => {
    const matchesSearch = servicio.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         servicio.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || servicio.categoria === categoryFilter;
    const matchesStatus = !statusFilter || 
                         (statusFilter === 'disponible' && servicio.disponible) ||
                         (statusFilter === 'no_disponible' && !servicio.disponible);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = [...new Set(servicios.map(s => s.categoria))];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Servicios</h1>
        <button
          onClick={handleCreateService}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Nuevo Servicio
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar servicios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option key="todas" value="">Todas las categorías</option>
              {categories.map((category: string) => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option key="todos" value="">Todos los estados</option>
              <option key="disponible" value="disponible">Disponible</option>
              <option key="no_disponible" value="no_disponible">No disponible</option>
            </select>
          </div>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Servicio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredServicios.map((servicio) => (
                <tr key={servicio.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{servicio.nombre}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">{servicio.descripcion}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {servicio.categoria}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(servicio.precio)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      servicio.disponible 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {servicio.disponible ? 'Disponible' : 'No disponible'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleViewService(servicio)}
                        className="text-gray-600 hover:text-gray-900 p-1"
                        title="Ver detalles"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleManageCredentials(servicio)}
                        className="text-green-600 hover:text-green-900 p-1"
                        title="Gestionar credenciales"
                      >
                        <KeyIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditService(servicio)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Editar"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteService(servicio)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Eliminar"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredServicios.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No se encontraron servicios</div>
        </div>
      )}

      {/* Service Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {modalMode === 'create' ? 'Nuevo Servicio' : 
                   modalMode === 'edit' ? 'Editar Servicio' : 'Detalles del Servicio'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {modalMode === 'view' ? (
                // View Mode
                <div className="space-y-4">
                  {(selectedServicio?.logoUrl || selectedServicio?.imagen) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
                      <img
                        src={selectedServicio.logoUrl || selectedServicio.imagen}
                        alt={selectedServicio.nombre}
                        className="w-20 h-20 object-contain rounded-md border border-gray-200 bg-gray-50"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <p className="text-sm text-gray-900">{selectedServicio?.nombre}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <p className="text-sm text-gray-900">{selectedServicio?.descripcion}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                      <p className="text-sm text-gray-900">{selectedServicio && formatCurrency(selectedServicio.precio)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                      <p className="text-sm text-gray-900">{selectedServicio?.categoria}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedServicio?.disponible 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedServicio?.disponible ? 'Disponible' : 'No disponible'}
                    </span>
                  </div>
                  {selectedServicio?.caracteristicas && Array.isArray(selectedServicio.caracteristicas) && selectedServicio.caracteristicas.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Características</label>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(selectedServicio.caracteristicas) && selectedServicio.caracteristicas.map((caracteristica: string, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {caracteristica}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Create/Edit Form
                <form onSubmit={handleSubmitForm} className="space-y-4">
                  <div>
                    <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción *
                    </label>
                    <textarea
                      id="descripcion"
                      value={formData.descripcion}
                      onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-1">
                        Logo (URL)
                      </label>
                      <input
                        type="url"
                        id="logoUrl"
                        value={formData.logoUrl}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData(prev => ({ ...prev, logoUrl: value }));
                          if (!logoFile) setLogoPreview(value || null);
                        }}
                        placeholder="https://.../logo.png"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">Pega una URL directa o sube un archivo.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subir logo (PNG/JPG/SVG, &lt; 2MB)
                      </label>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/svg+xml"
                        onChange={(e) => handleLogoFileChange(e.target.files?.[0] || null)}
                        className="w-full text-sm text-gray-700"
                      />
                    </div>
                  </div>

                  {logoPreview && (
                    <div className="flex items-center gap-3">
                      <img
                        src={logoPreview}
                        alt="Vista previa del logo"
                        className="w-16 h-16 object-contain rounded-md border border-gray-200 bg-gray-50"
                      />
                      <span className="text-sm text-gray-600">Vista previa</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="precio" className="block text-sm font-medium text-gray-700 mb-1">
                        Precio (CLP) *
                      </label>
                      <input
                        type="number"
                        id="precio"
                        value={formData.precio}
                        onChange={(e) => setFormData(prev => ({ ...prev, precio: e.target.value }))}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 mb-1">
                        Categoría *
                      </label>
                      <input
                        type="text"
                        id="categoria"
                        value={formData.categoria}
                        onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.disponible}
                        onChange={(e) => setFormData(prev => ({ ...prev, disponible: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Servicio disponible</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Características
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newCaracteristica}
                        onChange={(e) => setNewCaracteristica(e.target.value)}
                        placeholder="Agregar característica..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCaracteristica())}
                      />
                      <button
                        type="button"
                        onClick={addCaracteristica}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                    {formData.caracteristicas.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.caracteristicas.map((caracteristica: string, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {caracteristica}
                            <button
                              type="button"
                              onClick={() => removeCaracteristica(index)}
                              className="ml-1 text-blue-600 hover:text-blue-800"
                            >
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                      {modalMode === 'create' ? 'Crear Servicio' : 'Actualizar Servicio'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && servicioToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              <h3 className="text-lg font-medium text-gray-900">Confirmar eliminación</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              ¿Estás seguro de que deseas eliminar el servicio "{servicioToDelete.nombre}"? 
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Manager Modal */}
      {showCredentialsManager && servicioForCredentials && (
        <CredentialsManager
          servicio={servicioForCredentials}
          onClose={() => {
            setShowCredentialsManager(false);
            setServicioForCredentials(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminServices;
