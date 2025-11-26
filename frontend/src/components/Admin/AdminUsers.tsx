import React, { useState, useEffect } from 'react';
import { adminService, type ClienteAdmin, type FiltrosClientes, type SuspenderClienteData } from '../../services/adminService';
import type { CarritoItem } from '../../types';
import {
  MagnifyingGlassIcon,
  EyeIcon,
  UserIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  XMarkIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline';

interface CarritoResponse {
  cliente: {
    id: string;
    nombre: string;
    email: string;
  };
  carritos: Array<{
    id: string;
    items: CarritoItem[];
    total?: number;
    createdAt?: string;
  }>;
  estadisticas: {
    totalCarritos: number;
    valorTotal: number;
  };
}

const AdminUsers: React.FC = () => {
  const [clientes, setClientes] = useState<ClienteAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filters state
  const [filtros, setFiltros] = useState<FiltrosClientes>({
    search: '',
    activo: undefined,
    page: 1,
    limit: 10
  });
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showCarritoModal, setShowCarritoModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteAdmin | null>(null);
  const [clienteToSuspend, setClienteToSuspend] = useState<ClienteAdmin | null>(null);
  const [carritoData, setCarritoData] = useState<CarritoResponse | null>(null);

  // Form state
  const [suspendForm, setSuspendForm] = useState<SuspenderClienteData>({
    motivo: '',
    duracion: undefined
  });

  // Load clients
  const cargarClientes = async () => {
    try {
      setLoading(true);
      const response = await adminService.consultarClientes(filtros);
      setClientes(response.clientes);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (err) {
      setError('Error al cargar clientes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, [filtros]);

  // Handle client actions
  const handleVerCliente = (cliente: ClienteAdmin) => {
    setClienteSeleccionado(cliente);
    setShowModal(true);
  };

  const handleVerCarrito = async (cliente: ClienteAdmin) => {
    try {
      const response = await adminService.consultarCarritoCliente(cliente.id);
      setCarritoData(response);
      setShowCarritoModal(true);
    } catch (err) {
      setError('Error al cargar carrito del cliente');
      console.error(err);
    }
  };

  const handleSuspenderCliente = (cliente: ClienteAdmin) => {
    setClienteToSuspend(cliente);
    setShowSuspendModal(true);
  };

  const confirmarSuspension = async () => {
    if (!clienteToSuspend) return;

    try {
      await adminService.suspenderCliente(clienteToSuspend.id, suspendForm);
      setShowSuspendModal(false);
      setSuspendForm({ motivo: '', duracion: undefined });
      setClienteToSuspend(null);
      cargarClientes();
    } catch (err) {
      setError('Error al suspender cliente');
      console.error(err);
    }
  };

  // Filter clients
  const handleSearch = (value: string) => {
    setFiltros(prev => ({ ...prev, search: value, page: 1 }));
  };

  const handleFilterChange = (key: keyof FiltrosClientes, value: string | number | boolean | undefined) => {
    setFiltros(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  // Pagination
  const handlePageChange = (page: number) => {
    setFiltros(prev => ({ ...prev, page }));
  };

  // Format helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Clientes</h1>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar clientes..."
              value={filtros.search || ''}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={filtros.activo === undefined ? '' : filtros.activo.toString()}
            onChange={(e) => handleFilterChange('activo', e.target.value === '' ? undefined : e.target.value === 'true')}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option key="todos" value="">Todos los estados</option>
            <option key="activos" value="true">Activos</option>
            <option key="suspendidos" value="false">Suspendidos</option>
          </select>

          <select
            value={filtros.limit || 10}
            onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option key="10" value={10}>10 por página</option>
            <option key="25" value={25}>25 por página</option>
            <option key="50" value={50}>50 por página</option>
          </select>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Suscripciones
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Gasto Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Registro
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {clientes.map((cliente) => (
              <tr key={cliente.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <UserIcon className="h-6 w-6 text-gray-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {cliente.nombre}
                      </div>
                      <div className="text-sm text-gray-500">
                        {cliente.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    cliente.activo 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {cliente.activo ? 'Activo' : 'Suspendido'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {cliente.metricas.suscripcionesActivas}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(cliente.metricas.gastoTotal)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(cliente.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => handleVerCliente(cliente)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Ver detalles"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleVerCarrito(cliente)}
                      className="text-green-600 hover:text-green-900"
                      title="Ver carrito"
                    >
                      <ShoppingCartIcon className="h-5 w-5" />
                    </button>
                    {cliente.activo && (
                      <button
                        onClick={() => handleSuspenderCliente(cliente)}
                        className="text-red-600 hover:text-red-900"
                        title="Suspender cliente"
                      >
                        <XCircleIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange((filtros.page || 1) - 1)}
                disabled={(filtros.page || 1) <= 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => handlePageChange((filtros.page || 1) + 1)}
                disabled={(filtros.page || 1) >= totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Página <span className="font-medium">{filtros.page || 1}</span> de{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === (filtros.page || 1)
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Client Details Modal */}
      {showModal && clienteSeleccionado && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Detalles del Cliente</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre</label>
                  <p className="mt-1 text-sm text-gray-900">{clienteSeleccionado.nombre}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{clienteSeleccionado.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                  <p className="mt-1 text-sm text-gray-900">{clienteSeleccionado.telefono || 'No especificado'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estado</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    clienteSeleccionado.activo 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {clienteSeleccionado.activo ? 'Activo' : 'Suspendido'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha de Registro</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(clienteSeleccionado.createdAt)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Suscripciones Activas</label>
                  <p className="mt-1 text-sm text-gray-900">{clienteSeleccionado.metricas.suscripcionesActivas}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gasto Total</label>
                  <p className="mt-1 text-sm text-gray-900">{formatCurrency(clienteSeleccionado.metricas.gastoTotal)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gasto Mensual</label>
                  <p className="mt-1 text-sm text-gray-900">{formatCurrency(clienteSeleccionado.metricas.gastoMensual)}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Modal */}
      {showCarritoModal && carritoData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Carrito de {carritoData.cliente.nombre}
              </h3>
              <button
                onClick={() => setShowCarritoModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {carritoData.carritos.length > 0 ? (
                carritoData.carritos.map((carrito) => (
                  <div key={carrito.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Carrito #{carrito.id.slice(-8)}</h4>
                      <span className="text-sm text-gray-500">
                        {carrito.createdAt ? formatDate(carrito.createdAt) : 'Fecha no disponible'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {carrito.items.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">{item.servicio.nombre}</span>
                            <span className="text-gray-500 ml-2">x{item.cantidad}</span>
                          </div>
                          <span>{formatCurrency(item.precio * item.cantidad)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-medium">
                        <span>Total:</span>
                        <span>{formatCurrency(carrito.total || 0)}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No hay carritos para este cliente</p>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowCarritoModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Client Modal */}
      {showSuspendModal && clienteToSuspend && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Suspender Cliente: {clienteToSuspend.nombre}
              </h3>
              <button
                onClick={() => setShowSuspendModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo de la suspensión *
                </label>
                <textarea
                  value={suspendForm.motivo}
                  onChange={(e) => setSuspendForm(prev => ({ ...prev, motivo: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe el motivo de la suspensión..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duración (opcional)
                </label>
                <input
                  type="text"
                  value={suspendForm.duracion || ''}
                  onChange={(e) => setSuspendForm(prev => ({ ...prev, duracion: e.target.value || undefined }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: 30 días, indefinido, hasta revisión..."
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowSuspendModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarSuspension}
                disabled={!suspendForm.motivo.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suspender Cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;