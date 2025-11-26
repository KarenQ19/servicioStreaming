import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import {
  UsersIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  CogIcon
} from '@heroicons/react/24/outline';

interface DashboardMetrics {
  totalClientes: number;
  clientesActivos: number;
  ventasHoy: number;
  ventasMes: number;
  serviciosActivos: number;
  carritosActivos: number;
  ingresosMensuales: number;
  crecimientoMensual: number;
}

interface ServicioPopular {
  id: string;
  nombre: string;
  suscripciones: number;
  ingresos: number;
}

const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [serviciosPopulares, setServiciosPopulares] = useState<ServicioPopular[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Cargar catálogo con estadísticas
      const catalogoResponse = await adminService.consultarCatalogo();
      
      // Cargar reportes de ventas del mes actual
      const fechaInicio = new Date();
      fechaInicio.setDate(1); // Primer día del mes
      const fechaFin = new Date();
      
      const reportesResponse = await adminService.consultarReportesVentas({
        fechaInicio: fechaInicio.toISOString().split('T')[0],
        fechaFin: fechaFin.toISOString().split('T')[0],
        periodo: 'mensual'
      });

      // Procesar métricas
      const catalogoData = catalogoResponse;
      const reportesData = reportesResponse;

      // Calcular ventas del mes a partir de ventasPorPeriodo
      const ventasMesActual = reportesData.ventasPorPeriodo
        ?.filter((venta: any) => {
          const fecha = new Date(venta.periodo);
          const hoy = new Date();
          return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
        })
        .reduce((total: number, venta: any) => total + venta.cantidadVentas, 0) || 0;

      // Calcular ingresos del mes actual
      const ingresosMesActual = reportesData.ventasPorPeriodo
        ?.filter((venta: any) => {
          const fecha = new Date(venta.periodo);
          const hoy = new Date();
          return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
        })
        .reduce((total: number, venta: any) => total + venta.ingresos, 0) || 0;

      // Calcular ventas de hoy
      const hoy = new Date().toISOString().split('T')[0];
      const ventasHoy = reportesData.ventasPorPeriodo
        ?.filter((venta: any) => venta.periodo === hoy)
        .reduce((total: number, venta: any) => total + venta.cantidadVentas, 0) || 0;

      const dashboardMetrics: DashboardMetrics = {
        totalClientes: catalogoData.estadisticas?.totalClientes || 0,
        clientesActivos: catalogoData.estadisticas?.clientesActivos || 0,
        ventasHoy: ventasHoy,
        ventasMes: ventasMesActual,
        serviciosActivos: catalogoData.servicios?.length || 0,
        carritosActivos: catalogoData.estadisticas?.carritosActivos || 0,
        ingresosMensuales: ingresosMesActual,
        crecimientoMensual: 0, // No hay datos de crecimiento mensual en el tipo actual
      };

      // Procesar servicios populares
      const serviciosPopularesData: ServicioPopular[] = catalogoData.servicios
        ?.sort((a: any, b: any) => (b.metricas?.suscripcionesActivas || 0) - (a.metricas?.suscripcionesActivas || 0))
        .slice(0, 5)
        .map((servicio: any) => ({
          id: servicio.id,
          nombre: servicio.nombre,
          suscripciones: servicio.metricas?.suscripcionesActivas || 0,
          ingresos: servicio.metricas?.ingresosMensuales || 0,
        })) || [];

      setMetrics(dashboardMetrics);
      setServiciosPopulares(serviciosPopularesData);
    } catch (err) {
      setError('Error al cargar los datos del dashboard');
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={loadDashboardData}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  };

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ComponentType<any>;
    trend?: number;
    color: string;
  }> = ({ title, value, icon: Icon, trend, color }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend !== undefined && (
            <div className="flex items-center mt-2">
              {trend >= 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(trend)}%
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Resumen general del sistema</p>
        </div>
        <button
          onClick={loadDashboardData}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Clientes"
          value={metrics?.totalClientes || 0}
          icon={UsersIcon}
          color="bg-blue-500"
        />
        <MetricCard
          title="Clientes Activos"
          value={metrics?.clientesActivos || 0}
          icon={UsersIcon}
          color="bg-green-500"
        />
        <MetricCard
          title="Ventas del Mes"
          value={metrics?.ventasMes || 0}
          icon={ChartBarIcon}
          color="bg-purple-500"
        />
        <MetricCard
          title="Ingresos Mensuales"
          value={formatCurrency(metrics?.ingresosMensuales || 0)}
          icon={CurrencyDollarIcon}
          trend={metrics?.crecimientoMensual}
          color="bg-yellow-500"
        />
      </div>

      {/* Métricas secundarias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Servicios Activos"
          value={metrics?.serviciosActivos || 0}
          icon={CogIcon}
          color="bg-indigo-500"
        />
        <MetricCard
          title="Carritos Activos"
          value={metrics?.carritosActivos || 0}
          icon={ShoppingCartIcon}
          color="bg-pink-500"
        />
        <MetricCard
          title="Ventas Hoy"
          value={metrics?.ventasHoy || 0}
          icon={ArrowTrendingUpIcon}
          color="bg-teal-500"
        />
      </div>

      {/* Servicios populares */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Servicios Más Populares</h3>
        </div>
        <div className="p-6">
          {serviciosPopulares.length > 0 ? (
            <div className="space-y-4">
              {serviciosPopulares.map((servicio, index) => (
                <div key={servicio.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium">#{index + 1}</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">{servicio.nombre}</p>
                      <p className="text-sm text-gray-500">{servicio.suscripciones} suscripciones</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(servicio.ingresos)}
                    </p>
                    <p className="text-xs text-gray-500">ingresos mensuales</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <EyeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No hay datos de servicios disponibles</p>
            </div>
          )}
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Acciones Rápidas</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <UsersIcon className="mr-2 h-5 w-5" />
              Ver Clientes
            </button>
            <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <CogIcon className="mr-2 h-5 w-5" />
              Gestionar Servicios
            </button>
            <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <ChartBarIcon className="mr-2 h-5 w-5" />
              Ver Reportes
            </button>
            <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <ShoppingCartIcon className="mr-2 h-5 w-5" />
              Ver Carritos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;