import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Users, 
  BarChart3, 
  Settings,
  TrendingUp
} from 'lucide-react';
import clienteService from '../services/clienteService';

// Componentes de administrador
import AdminNavbar from '../components/Admin/AdminNavbar';
import AdminDashboard from '../components/Admin/AdminDashboard';
import AdminServices from '../components/Admin/AdminServices';
import AdminUsers from '../components/Admin/AdminUsers';
import AdminReports from '../components/Admin/AdminReports';
import AdminSettings from '../components/Admin/AdminSettings';

// Componentes de cliente
import MisSuscripciones from '../components/Client/MisSuscripciones';
import ServiciosRecomendados from '../components/Client/ServiciosRecomendados';
import MisCredenciales from '../components/MisCredenciales';

import '../styles/admin.css';

type AdminSection = 'dashboard' | 'services' | 'users' | 'reports' | 'settings';

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [metricas, setMetricas] = useState({
    suscripcionesActivas: 0,
    gastoMensual: 0,
    gastoTotal: 0,
    ultimosPagos: [],
    serviciosRecomendados: []
  });

  useEffect(() => {
    console.log('🔍 Dashboard useEffect - Estado de autenticación:', {
      isAuthenticated,
      user,
      userRole: user?.role
    });
    
    if (!isAuthenticated) {
      console.log('❌ Usuario no autenticado, redirigiendo a login');
      navigate('/login');
      return;
    }
    
    if (user?.role === 'CLIENTE') {
      console.log('✅ Usuario es CLIENTE, cargando métricas');
      cargarMetricasCliente();
    } else {
      console.log('ℹ️ Usuario no es CLIENTE, rol:', user?.role);
    }
    
    setIsLoading(false);
  }, [isAuthenticated, navigate, user?.role]);

  const cargarMetricasCliente = async () => {
    try {
      setIsLoading(true);
      const data = await clienteService.obtenerMetricas();
      setMetricas(data);
    } catch (error) {
      console.error('Error al cargar métricas del cliente:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Si es administrador, mostrar panel de administración
  if (user?.role === 'ADMINISTRADOR') {
    const menuItems = [
      {
        id: 'dashboard' as AdminSection,
        name: 'Dashboard',
        icon: BarChart3,
        description: 'Resumen general y métricas'
      },
      {
        id: 'services' as AdminSection,
        name: 'Servicios',
        icon: Package,
        description: 'Gestión del catálogo de servicios'
      },
      {
        id: 'users' as AdminSection,
        name: 'Usuarios',
        icon: Users,
        description: 'Gestión de clientes'
      },
      {
        id: 'reports' as AdminSection,
        name: 'Reportes',
        icon: TrendingUp,
        description: 'Análisis y estadísticas'
      },
      {
        id: 'settings' as AdminSection,
        name: 'Configuración',
        icon: Settings,
        description: 'Configuración del sistema'
      }
    ];

    const renderAdminContent = () => {
      switch (activeSection) {
        case 'dashboard':
          return <AdminDashboard />;
        case 'services':
          return <AdminServices />;
        case 'users':
          return <AdminUsers />;
        case 'reports':
          return <AdminReports />;
        case 'settings':
          return <AdminSettings />;
        default:
          return <AdminDashboard />;
      }
    };

    if (isLoading) {
      return (
        <div className="admin-loading">
          <div className="loading-spinner"></div>
          <p>Cargando panel de administrador...</p>
        </div>
      );
    }

    return (
      <div className="admin-panel">
        <AdminNavbar />
        
        <div className="admin-content">
          {/* Sidebar */}
          <aside className="admin-sidebar">
            <div className="sidebar-header">
              <h2>Panel Admin</h2>
              <p>Bienvenido, {user?.nombre}</p>
            </div>
            
            <nav className="sidebar-nav">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                  >
                    <Icon size={20} />
                    <div className="nav-item-content">
                      <span className="nav-item-name">{item.name}</span>
                      <span className="nav-item-description">{item.description}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="admin-main">
            <div className="admin-main-header">
              <h1>{menuItems.find(item => item.id === activeSection)?.name}</h1>
              <p>{menuItems.find(item => item.id === activeSection)?.description}</p>
            </div>
            
            <div className="admin-main-content">
              {renderAdminContent()}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Dashboard para clientes
  console.log('🎯 Renderizando dashboard de cliente para usuario:', user);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            ¡Bienvenido, {user?.nombre}!
          </h1>
          <p className="mt-2 text-gray-600">
            Gestiona tus suscripciones y descubre nuevos servicios de streaming
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Suscripciones Activas</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {isLoading ? '...' : metricas.suscripcionesActivas}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Gasto Mensual</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {isLoading ? '...' : `$${metricas.gastoMensual.toFixed(2)}`}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Gasto Total</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {isLoading ? '...' : `$${metricas.gastoTotal.toFixed(2)}`}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Ahorro Potencial</p>
                <p className="text-2xl font-semibold text-gray-900">$15.00</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Columna izquierda y central - Mis Suscripciones */}
          <div className="lg:col-span-2">
            <MisSuscripciones />
          </div>
          
          {/* Columna derecha - Servicios Recomendados */}
          <div className="lg:col-span-1">
            <ServiciosRecomendados 
              servicios={metricas.serviciosRecomendados} 
              isLoading={isLoading} 
            />
          </div>
        </div>

        {/* Sección de Credenciales - Ancho completo */}
        <div className="w-full">
          <MisCredenciales />
        </div>
      </div>
    </div>
  );
}