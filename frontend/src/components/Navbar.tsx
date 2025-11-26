import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CreditCard, CheckCircle, AlertCircle, Clock, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { pagoService } from '../services/pagoService';
import CarritoButton from './Carrito/CarritoButton';

interface Notificacion {
  id: string;
  tipo: 'pago_completado' | 'pago_pendiente' | 'pago_fallido' | 'suscripcion_renovada' | 'metodo_pago_vencido';
  titulo: string;
  mensaje: string;
  fecha: Date;
  leida: boolean;
  accion?: {
    texto: string;
    url: string;
  };
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
  const [estadoPagos, setEstadoPagos] = useState({
    pagosCompletados: 0,
    pagosPendientes: 0,
    pagosFallidos: 0
  });

  useEffect(() => {
    if (user && user.role === 'CLIENTE') {
      cargarNotificaciones();
      cargarEstadoPagos();
      
      // Actualizar cada 30 segundos
      const interval = setInterval(() => {
        cargarNotificaciones();
        cargarEstadoPagos();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [user]);

  const cargarNotificaciones = async () => {
    try {
      // Simular notificaciones basadas en el historial de pagos
      const historial = await pagoService.consultarHistorialPagos();
      
      const nuevasNotificaciones: Notificacion[] = historial.pagos
        .slice(0, 5) // Solo las 5 más recientes
        .map(pago => ({
          id: pago.id,
          tipo: pago.estado === 'COMPLETADO' ? 'pago_completado' : 
                pago.estado === 'PENDIENTE' ? 'pago_pendiente' : 'pago_fallido',
          titulo: pago.estado === 'COMPLETADO' ? 'Pago completado' :
                  pago.estado === 'PENDIENTE' ? 'Pago pendiente' : 'Pago fallido',
          mensaje: `${pago.descripcion} - ${pagoService.formatearPrecio(pago.monto)}`,
          fecha: new Date(pago.createdAt),
          leida: false,
          accion: pago.estado === 'FALLIDO' ? {
            texto: 'Reintentar pago',
            url: '/dashboard'
          } : undefined
        }));

      setNotificaciones(nuevasNotificaciones);
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
    }
  };

  const cargarEstadoPagos = async () => {
    try {
      const resumen = await pagoService.obtenerResumenPagos();
      
      setEstadoPagos({
        pagosCompletados: resumen.estadosPagos.completados.cantidad,
        pagosPendientes: resumen.estadosPagos.pendientes.cantidad,
        pagosFallidos: resumen.estadosPagos.fallidos.cantidad
      });
    } catch (error) {
      console.error('Error al cargar estado de pagos:', error);
    }
  };

  const marcarNotificacionLeida = (id: string) => {
    setNotificaciones(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, leida: true } : notif
      )
    );
  };

  const obtenerIconoNotificacion = (tipo: Notificacion['tipo']) => {
    switch (tipo) {
      case 'pago_completado':
      case 'suscripcion_renovada':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pago_pendiente':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'pago_fallido':
      case 'metodo_pago_vencido':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const notificacionesNoLeidas = notificaciones.filter(n => !n.leida).length;
  const hayPagosProblematicos = estadoPagos.pagosPendientes > 0 || estadoPagos.pagosFallidos > 0;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700">
            StreamingApp
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex space-x-8">
              <Link to="/" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Inicio
              </Link>
              <Link to="/catalogo" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Catálogo
              </Link>
              {user ? (
                <>
                  {user.role === 'CLIENTE' && (
                    <Link to="/dashboard" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                      Dashboard
                    </Link>
                  )}
                  <Link to="/historial-pagos" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    Historial de Pagos
                  </Link>
                  <Link to="/historial-validaciones" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    Validaciones OCR
                  </Link>
                  {user.role === 'ADMINISTRADOR' && (
                    <Link to="/admin" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                      Panel Admin
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Cerrar Sesión
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    Iniciar Sesión
                  </Link>
                  <Link to="/register" className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                    Registrarse
                  </Link>
                </>
              )}
            </div>
            
            {/* Indicadores y botones para usuarios autenticados */}
            {user && (
              <div className="flex items-center space-x-3">
                {/* Indicador de estado de pagos */}
                <div className="flex items-center space-x-1">
                  <CreditCard className={`h-5 w-5 ${hayPagosProblematicos ? 'text-red-500' : 'text-green-500'}`} />
                  {hayPagosProblematicos && (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                      {estadoPagos.pagosPendientes + estadoPagos.pagosFallidos}
                    </span>
                  )}
                </div>

                {/* Botón de notificaciones */}
                <div className="relative">
                  <button
                    onClick={() => setMostrarNotificaciones(!mostrarNotificaciones)}
                    className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Bell className="h-5 w-5" />
                    {notificacionesNoLeidas > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                        {notificacionesNoLeidas > 9 ? '9+' : notificacionesNoLeidas}
                      </span>
                    )}
                  </button>

                  {/* Panel de notificaciones */}
                  {mostrarNotificaciones && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">Notificaciones</h3>
                          <button
                            onClick={() => setMostrarNotificaciones(false)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="max-h-96 overflow-y-auto">
                        {notificaciones.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">
                            No hay notificaciones
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-200">
                            {notificaciones.map((notificacion) => (
                              <div
                                key={notificacion.id}
                                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                                  !notificacion.leida ? 'bg-blue-50' : ''
                                }`}
                                onClick={() => marcarNotificacionLeida(notificacion.id)}
                              >
                                <div className="flex items-start space-x-3">
                                  {obtenerIconoNotificacion(notificacion.tipo)}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <p className="text-sm font-medium text-gray-900">
                                        {notificacion.titulo}
                                      </p>
                                      {!notificacion.leida && (
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">
                                      {notificacion.mensaje}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {pagoService.formatearFecha(notificacion.fecha.toISOString())}
                                    </p>
                                    {notificacion.accion && (
                                      <Link
                                        to={notificacion.accion.url}
                                        className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                                        onClick={() => setMostrarNotificaciones(false)}
                                      >
                                        {notificacion.accion.texto}
                                      </Link>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {notificaciones.length > 0 && (
                        <div className="p-3 border-t border-gray-200">
                          <Link
                            to="/historial-pagos"
                            className="block text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                            onClick={() => setMostrarNotificaciones(false)}
                          >
                            Ver historial completo
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Carrito Button */}
                <CarritoButton />
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button className="text-gray-700 hover:text-blue-600 p-2">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay para cerrar notificaciones */}
      {mostrarNotificaciones && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setMostrarNotificaciones(false)}
        />
      )}
    </nav>
  );
}