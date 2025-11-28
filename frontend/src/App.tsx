import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CarritoProvider } from './context/CarritoContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Catalogo from './pages/Catalogo';
import ServicioDetalle from './pages/ServicioDetalle';
import HistorialPagos from './pages/HistorialPagos';
import HistorialValidacionesOCR from './pages/HistorialValidacionesOCR';
import AuthCallback from './pages/AuthCallback';

// Admin components
import AdminLayout from './components/Admin/AdminLayout';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminServicesPage from './pages/admin/AdminServicesPage';
import AdminClientsPage from './pages/admin/AdminClientsPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminCartsPage from './pages/admin/AdminCartsPage';
import AdminMetricsPage from './pages/admin/AdminMetricsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CarritoProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Navbar />
              <Routes>
                {/* Rutas públicas */}
                <Route path="/" element={<Home />} />
                <Route path="/catalogo" element={<Catalogo />} />
                <Route path="/servicio/:id" element={<ServicioDetalle />} />
                
                {/* Rutas de autenticación (solo para no autenticados) */}
                <Route 
                  path="/login" 
                  element={
                    <ProtectedRoute requireAuth={false}>
                      <Login />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/register" 
                  element={
                    <ProtectedRoute requireAuth={false}>
                      <Register />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Ruta para callback de autenticación social */}
                <Route path="/auth/callback" element={<AuthCallback />} />
                
                {/* Rutas protegidas (solo para autenticados) */}
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/historial-pagos" 
                  element={
                    <ProtectedRoute>
                      <HistorialPagos />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/historial-validaciones" 
                  element={
                    <ProtectedRoute>
                      <HistorialValidacionesOCR />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Rutas de administración (solo para administradores) */}
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminDashboardPage />} />
                  <Route path="servicios" element={<AdminServicesPage />} />
                  <Route path="clientes" element={<AdminClientsPage />} />
                  <Route path="reportes" element={<AdminReportsPage />} />
                  <Route path="carritos" element={<AdminCartsPage />} />
                  <Route path="metricas" element={<AdminMetricsPage />} />
                  <Route path="configuracion" element={<AdminSettingsPage />} />
                </Route>
                
                {/* Ruta por defecto - redirige a home */}
                <Route path="*" element={<Home />} />
              </Routes>
            </div>
          </Router>
        </CarritoProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
