import React, { useState, useEffect } from 'react';
import { adminService, type ReporteVentas, type ReporteActividad, type FiltrosReportes } from '../../services/adminService';
import {
  ChartBarIcon,
  CalendarIcon,
  UserIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  DocumentChartBarIcon,
  FunnelIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

const AdminReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ventas' | 'actividad'>('ventas');
  const [reporteVentas, setReporteVentas] = useState<ReporteVentas | null>(null);
  const [reporteActividad, setReporteActividad] = useState<ReporteActividad | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serviciosMasVendidos = (reporteVentas as any)?.ventasPorServicio || (reporteVentas as any)?.serviciosMasVendidos || [];

  // Filtros para reportes de ventas
  const [filtrosVentas, setFiltrosVentas] = useState<FiltrosReportes>({
    fechaInicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 días atrás
    fechaFin: new Date().toISOString().split('T')[0],
    periodo: 'diario'
  });

  // Filtros para reportes de actividad
  const [filtrosActividad, setFiltrosActividad] = useState<FiltrosReportes>({
    fechaInicio: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 días atrás
    fechaFin: new Date().toISOString().split('T')[0],
    periodo: 'diario'
  });

  useEffect(() => {
    if (activeTab === 'ventas') {
      loadReporteVentas();
    } else {
      loadReporteActividad();
    }
  }, [activeTab]);

  const loadReporteVentas = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.consultarReportesVentas(filtrosVentas);
      setReporteVentas(data);
    } catch (err) {
      setError('Error al cargar el reporte de ventas');
      console.error('Error loading sales report:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadReporteActividad = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.consultarReportesActividad(filtrosActividad);
      setReporteActividad(data);
    } catch (err) {
      setError('Error al cargar el reporte de actividad');
      console.error('Error loading activity report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltrosVentasChange = (newFiltros: Partial<FiltrosReportes>) => {
    setFiltrosVentas(prev => ({ ...prev, ...newFiltros }));
  };

  const handleFiltrosActividadChange = (newFiltros: Partial<FiltrosReportes>) => {
    setFiltrosActividad(prev => ({ ...prev, ...newFiltros }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('es-CL');
  };

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    color: string;
    subtitle?: string;
  }> = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${color} mr-4`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-600">Análisis de ventas y actividad del sistema</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('ventas')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'ventas'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CurrencyDollarIcon className="inline-block w-5 h-5 mr-2" />
            Reportes de Ventas
          </button>
          <button
            onClick={() => setActiveTab('actividad')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'actividad'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ChartBarIcon className="inline-block w-5 h-5 mr-2" />
            Reportes de Actividad
          </button>
        </nav>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Filtros</h3>
          <FunnelIcon className="h-5 w-5 text-gray-400" />
        </div>
        
        {activeTab === 'ventas' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
              <input
                type="date"
                value={filtrosVentas.fechaInicio}
                onChange={(e) => handleFiltrosVentasChange({ fechaInicio: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
              <input
                type="date"
                value={filtrosVentas.fechaFin}
                onChange={(e) => handleFiltrosVentasChange({ fechaFin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
              <select
                value={filtrosVentas.periodo}
                onChange={(e) => handleFiltrosVentasChange({ periodo: e.target.value as 'diario' | 'semanal' | 'mensual' | 'anual' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option key="diario" value="diario">Por Día</option>
                <option key="semanal" value="semanal">Por Semana</option>
                <option key="mensual" value="mensual">Por Mes</option>
                <option key="anual" value="anual">Por Año</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={loadReporteVentas}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Cargando...' : 'Aplicar Filtros'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'actividad' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
              <input
                type="date"
                value={filtrosActividad.fechaInicio}
                onChange={(e) => handleFiltrosActividadChange({ fechaInicio: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
              <input
                type="date"
                value={filtrosActividad.fechaFin}
                onChange={(e) => handleFiltrosActividadChange({ fechaFin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={loadReporteActividad}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Cargando...' : 'Aplicar Filtros'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Reportes de Ventas */}
      {activeTab === 'ventas' && reporteVentas && !loading && (
        <div className="space-y-6">
          {/* Métricas principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Ingresos Totales"
              value={formatCurrency(reporteVentas.resumen.ingresoTotal)}
              icon={CurrencyDollarIcon}
              color="bg-green-500"
              subtitle={`${reporteVentas.resumen.cantidadVentas} ventas`}
            />
            <MetricCard
              title="Ticket Promedio"
              value={formatCurrency(reporteVentas.resumen.ticketPromedio)}
              icon={ArrowTrendingUpIcon}
              color="bg-blue-500"
            />
            <MetricCard
              title="Nuevos Clientes"
              value={reporteVentas.estadisticas.nuevosClientes}
              icon={UserIcon}
              color="bg-purple-500"
            />
            <MetricCard
              title="Nuevas Suscripciones"
              value={reporteVentas.estadisticas.nuevasSuscripciones}
              icon={DocumentChartBarIcon}
              color="bg-orange-500"
            />
          </div>

          {/* Top Servicios */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Servicios Más Vendidos</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {(serviciosMasVendidos || []).length === 0 ? (
                  <p className="text-gray-500 text-sm">No hay ventas registradas en el periodo seleccionado.</p>
                ) : (
                  (serviciosMasVendidos || [])
                    .slice()
                    .sort((a, b) => b.ingresos - a.ingresos)
                    .slice(0, 3)
                    .map((servicio, index) => {
                      const nombre = servicio.servicio?.nombre || servicio.servicio?.id || 'Servicio';
                      const ingresos = servicio.ingresos ?? servicio.totalVentas ?? 0;
                      const ventas = servicio.cantidadVentas ?? servicio.totalVentas ?? 0;
                      return (
                        <div
                          key={servicio.servicio.id || `${nombre}-${index}`}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-blue-50/60 transition"
                        >
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-medium">#{index + 1}</span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-900">{nombre}</p>
                              <p className="text-sm text-gray-500">
                                {ventas} ventas · {formatCurrency(ingresos)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(ingresos)}
                            </p>
                            <p className="text-xs text-gray-500">{ventas} unidades</p>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>

          {/* Top Clientes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Mejores Clientes</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {reporteVentas.topClientes.map((cliente, index) => (
                  <div key={cliente.cliente.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 font-medium">#{index + 1}</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">{cliente.cliente.nombre}</p>
                        <p className="text-sm text-gray-500">{cliente.cliente.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(cliente.totalGastado)}
                      </p>
                      <p className="text-xs text-gray-500">{cliente.cantidadCompras} compras</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reportes de Actividad */}
      {activeTab === 'actividad' && reporteActividad && !loading && (
        <div className="space-y-6">
          {/* Métricas de actividad */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Usuarios Activos"
              value={reporteActividad.resumen.metricas.usuariosActivos}
              icon={UserIcon}
              color="bg-blue-500"
            />
            <MetricCard
              title="Total Usuarios"
              value={reporteActividad.resumen.metricas.totalUsuarios}
              icon={ChartBarIcon}
              color="bg-green-500"
            />
            <MetricCard
              title="Carritos Creados"
              value={reporteActividad.resumen.metricas.carritosCreados}
              icon={DocumentChartBarIcon}
              color="bg-purple-500"
            />
            <MetricCard
              title="Tasa de Conversión"
              value={reporteActividad.resumen.metricas.tasaConversion}
              icon={CalendarIcon}
              color="bg-orange-500"
            />
          </div>

          {/* Actividad por día */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Registros por Día</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {reporteActividad.usuarios.registrosPorDia.map((registro, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(registro.createdAt)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Nuevos registros
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {registro._count.id} usuarios
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
