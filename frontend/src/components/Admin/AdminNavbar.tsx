import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Bell, Search } from 'lucide-react';

const AdminNavbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="admin-navbar">
      <div className="navbar-left">
        <div className="navbar-brand">
          <h1>StreamingAdmin</h1>
        </div>
      </div>

      <div className="navbar-center">
        <div className="search-container">
          <Search size={20} />
          <input 
            type="text" 
            placeholder="Buscar usuarios, servicios..." 
            className="search-input"
          />
        </div>
      </div>

      <div className="navbar-right">
        <button className="notification-btn">
          <Bell size={20} />
          <span className="notification-badge">3</span>
        </button>

        <div className="user-menu">
          <div className="user-info">
            <User size={20} />
            <span>{user?.nombre}</span>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;