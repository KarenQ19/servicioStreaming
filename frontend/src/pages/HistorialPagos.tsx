import { useState, useEffect } from 'react';
import { Filter, CreditCard, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { pagoService, type Pago, type ResumenPagosResponse } from '../services/pagoService';
import { useAuth } from '../hooks/useAuth';

export default function HistorialPagos() {
  const { user } = useAuth();
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [resumen, setResumen] = useState<ResumenPagosResponse | null>(null);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [filtros, setFiltros] = useState({
    fechaInicio: '',
    fechaFin: '',
    estado: '',
    metodoPagoId: ''
  });
  const [paginaActual, setPaginaActual] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [resumenAdmin, setResumenAdmin] = useState<{
    totalPagos: number;
    montoTotal: number;
    pendientes: number;
    completados: number;
    fallidos: number;
  } | null>(null);

  useEffect(() => {
    cargarPagos();
    if (user?.role !== 'ADMINISTRADOR') {
      cargarResumen();
    }
  }, [filtros, paginaActual]);

  const cargarPagos = async () => {
    try {
      setCargando(true);
      const params = { page: paginaActual, limit: 10, ...filtros };
      const response = user?.role === 'ADMINISTRADOR'
        ? await pagoService.consultarHistorialPagosAdmin(params)
        : await pagoService.consultarHistorialPagos(params);
      setPagos(response.pagos || []);
      setTotalPaginas(response.paginacion.totalPaginas);
      if (user?.role === 'ADMINISTRADOR' && (response as any).estadisticas) {
        const est = (response as any).estadisticas;
        const pendientes = est.estadisticasPorEstado?.find((e: any) => e.estado === 'PENDIENTE')?.cantidad || 0;
        const completados = est.estadisticasPorEstado?.find((e: any) => e.estado === 'COMPLETADO')?.cantidad || 0;
        const fallidos = est.estadisticasPorEstado?.find((e: any) => e.estado === 'FALLIDO')?.cantidad || 0;
        setResumenAdmin({
          totalPagos: est.totalPagos || 0,
          montoTotal: est.montoTotal || 0,
          pendientes,
          completados,
          fallidos
        });
      }
    } catch (error) {
      console.error('Error al cargar pagos:', error);
      setError('Error al cargar el historial de pagos');
    } finally {
      setCargando(false);
    }
  };

  const cargarResumen = async () => {
    try {
      const response = await pagoService.obtenerResumenPagos();
      setResumen(response);
    } catch (error) {
      console.error('Error al cargar resumen:', error);
    }
  };

  const obtenerIconoEstado = (estado: string) => {
    switch (estado) {
      case 'COMPLETADO':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'PENDIENTE':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'FALLIDO':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'REEMBOLSADO':
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const aplicarFiltros = () => {
    setPaginaActual(1);
    cargarPagos();
  };

  const limpiarFiltros = () => {
    setFiltros({
      fechaInicio: '',
      fechaFin: '',
      estado: '',
      metodoPagoId: ''
    });
    setPaginaActual(1);
  };

  if (cargando && pagos.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Historial de Pagos</h1>
          <p className="mt-2 text-gray-600">Gestiona y revisa todos tus pagos</p>
        </div>

        {/* Resumen Cards */}
        {(resumen && user?.role !== 'ADMINISTRADOR') || (resumenAdmin && user?.role === 'ADMINISTRADOR') ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CreditCard className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Pagos</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {user?.role === 'ADMINISTRADOR'
                        ? resumenAdmin?.totalPagos || 0
                        : (typeof resumen?.resumenGeneral?.totalPagos === 'number' ? resumen.resumenGeneral.totalPagos : 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Monto Total</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {user?.role === 'ADMINISTRADOR'
                        ? pagoService.formatearPrecio(resumenAdmin?.montoTotal || 0)
                        : pagoService.formatearPrecio(typeof resumen?.resumenGeneral?.montoTotal === 'number' ? resumen.resumenGeneral.montoTotal : 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pendientes</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {user?.role === 'ADMINISTRADOR'
                        ? resumenAdmin?.pendientes || 0
                        : (resumen?.estadosPagos?.pendientes?.cantidad || 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Fallidos</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {user?.role === 'ADMINISTRADOR'
                        ? resumenAdmin?.fallidos || 0
                        : (resumen?.estadosPagos?.fallidos?.cantidad || 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Filtros</h2>
            <button
              onClick={limpiarFiltros}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Limpiar filtros
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha inicio
              </label>
              <input
                type="date"
                value={filtros.fechaInicio}
                onChange={(e) => setFiltros(prev => ({ ...prev, fechaInicio: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha fin
              </label>
              <input
                type="date"
                value={filtros.fechaFin}
                onChange={(e) => setFiltros(prev => ({ ...prev, fechaFin: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={filtros.estado}
                onChange={(e) => setFiltros(prev => ({ ...prev, estado: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option key="todos" value="">Todos los estados</option>
                <option key="pendiente" value="PENDIENTE">Pendiente</option>
                <option key="completado" value="COMPLETADO">Completado</option>
                <option key="fallido" value="FALLIDO">Fallido</option>
                <option key="reembolsado" value="REEMBOLSADO">Reembolsado</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={aplicarFiltros}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Filter className="w-4 h-4 inline mr-2" />
                Aplicar
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Pagos */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Pagos Recientes</h2>
          </div>
          
          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-400">
              <p className="text-red-700">{error}</p>
            </div>
          )}
          
          <div className="divide-y divide-gray-200">
            {pagos.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No se encontraron pagos
              </div>
            ) : (
              pagos.map((pago) => (
                <div key={pago.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {obtenerIconoEstado(pago.estado)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {pago.descripcion || 'Pago sin descripción'}
                        </p>
                        {user?.role === 'ADMINISTRADOR' && (
                          <p className="text-xs text-gray-500">
                            {pago.cliente?.nombre || 'Cliente'} {pago.cliente?.email ? `· ${pago.cliente.email}` : ''}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          {(() => {
                            const suscripcionServicio = pago.suscripcion?.servicio?.nombre;
                            const itemsCarrito = pago.carrito?.items
                              ?.map((i) => i.servicio?.nombre)
                              .filter(Boolean)
                              .join(', ');
                            if (suscripcionServicio) return suscripcionServicio;
                            if (itemsCarrito) return itemsCarrito;
                            return 'Servicio no informado';
                          })()}
                        </p>
                        <p className="text-sm text-gray-500">
                          {pagoService.formatearFecha(pago.createdAt)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {pagoService.formatearPrecio(pago.monto)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {pago.metodoPago?.nombre || 'N/A'}
                        </p>
                      </div>
                      
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        pago.estado === 'COMPLETADO' ? 'bg-green-100 text-green-800' :
                        pago.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-800' :
                        pago.estado === 'FALLIDO' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {pago.estado}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Página {paginaActual} de {totalPaginas}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
                  disabled={paginaActual === 1}
                  className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
                  disabled={paginaActual === totalPaginas}
                  className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
