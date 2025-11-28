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
    ahorroPotencial: 0,
    ultimosPagos: [] as any[],
    serviciosRecomendados: [] as any[]
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
          return <AdminDashboard onNavigateSection={setActiveSection} />;
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
  const categoriasFrecuentes = metricas.ultimosPagos
    .map((p: any) => p?.servicio?.categoria)
    .filter(Boolean);
  const categoriaMasFrecuente = categoriasFrecuentes.length
    ? categoriasFrecuentes.sort((a, b) =>
        categoriasFrecuentes.filter(c => c === a).length -
        categoriasFrecuentes.filter(c => c === b).length
      ).pop()
    : null;

  const serviciosRecomendadosConRazon = metricas.serviciosRecomendados.map((s: any) => ({
    ...s,
    razon: categoriaMasFrecuente && s.categoria === categoriaMasFrecuente
      ? `Similar a tus servicios de ${categoriaMasFrecuente}`
      : 'Basado en tu historial reciente'
  }));
  
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Suscripciones Activas', value: isLoading ? '...' : metricas.suscripcionesActivas, color: 'from-blue-500 to-indigo-500', icon: '📄' },
            { label: 'Gasto Mensual', value: isLoading ? '...' : `$${Math.round(metricas.gastoMensual)}`, color: 'from-emerald-500 to-teal-500', icon: '💳' },
            { label: 'Gasto Total', value: isLoading ? '...' : `$${Math.round(metricas.gastoTotal)}`, color: 'from-purple-500 to-fuchsia-500', icon: '⏱️' },
            { label: 'Ahorro Potencial', value: isLoading ? '...' : `$${Math.round((metricas as any).ahorroPotencial || 0)}`, color: 'from-amber-500 to-orange-500', icon: '⬆️' },
          ].map((card) => (
            <div key={card.label} className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition transform hover:-translate-y-0.5">
              <div className={`absolute inset-0 opacity-10 bg-gradient-to-r ${card.color}`} />
              <div className="relative p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">{card.value}</p>
                </div>
                <div className="text-2xl">{card.icon}</div>
              </div>
            </div>
          ))}
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
              servicios={serviciosRecomendadosConRazon} 
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
