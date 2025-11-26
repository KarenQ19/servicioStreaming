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
import AdminNavbar from '../components/Admin/AdminNavbar';
import AdminDashboard from '../components/Admin/AdminDashboard';
import AdminServices from '../components/Admin/AdminServices';
import AdminUsers from '../components/Admin/AdminUsers';
import AdminReports from '../components/Admin/AdminReports';
import AdminSettings from '../components/Admin/AdminSettings';
import '../styles/admin.css';

type AdminSection = 'dashboard' | 'services' | 'users' | 'reports' | 'settings';

const AdminPanel = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user?.role !== 'ADMINISTRADOR') {
      navigate('/dashboard');
      return;
    }

    setIsLoading(false);
  }, [isAuthenticated, user, navigate]);

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

  const renderContent = () => {
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
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;