import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Star, 
  Users, 
  DollarSign, 
  Calendar, 
  Check, 
  X, 
  Play,
  Download,
  Shield,
  Smartphone,
  Monitor,
  Tv,
  Globe,
  ShoppingCart
} from 'lucide-react';
import { catalogoService, type Servicio } from '../services/catalogoService';
import { useAuth } from '../hooks/useAuth';
import { useCarrito } from '../context/CarritoContext';
import { getServicioLogo } from '../utils/serviceLogos';
import CheckoutModal from '../components/Carrito/CheckoutModal';

export default function ServicioDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { agregarItem, obtenerCarrito, state } = useCarrito();
  const isAdmin = user?.role === 'ADMINISTRADOR';
  
  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disponibilidad, setDisponibilidad] = useState<{
    disponible: boolean;
    mensaje?: string;
  } | null>(null);
  const [suscribiendo, setSuscribiendo] = useState(false);
  const [agregandoCarrito, setAgregandoCarrito] = useState(false);
  const [mostrarCheckout, setMostrarCheckout] = useState(false);

  useEffect(() => {
    if (id) {
      cargarServicio();
      verificarDisponibilidad();
    }
  }, [id]);

  const cargarServicio = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Cargando servicio con ID:', id);
      const response = await catalogoService.obtenerDetallesServicio(id!);
      console.log('Respuesta del servicio:', response);
      
      if (response.success) {
        console.log('Servicio cargado exitosamente:', response.data);
        setServicio(response.data);
      } else {
        console.log('Error: Servicio no encontrado');
        setError('Servicio no encontrado');
      }
    } catch (error) {
      console.error('Error al cargar servicio:', error);
      setError('Error al cargar el servicio');
    } finally {
      setLoading(false);
    }
  };

  const verificarDisponibilidad = async () => {
    try {
      const response = await catalogoService.verificarDisponibilidad(id!);
      if (response.success) {
        setDisponibilidad(response.data);
      }
    } catch (error) {
      console.error('Error al verificar disponibilidad:', error);
    }
  };

  const handleSuscripcion = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!servicio) return;

    try {
      setSuscribiendo(true);
      if (!estaEnCarrito()) {
        const agregado = await agregarItem(servicio.id, 1);
        if (!agregado) {
          alert('No pudimos preparar tu suscripcion, intenta nuevamente.');
          return;
        }
        await obtenerCarrito();
      }
      setMostrarCheckout(true);
    } catch (error) {
      console.error('Error al suscribirse:', error);
      alert('Error al procesar la suscripcion. Intentalo de nuevo.');
    } finally {
      setSuscribiendo(false);
    }
  };

  const handleAgregarCarrito = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!servicio) return;

    try {
      setAgregandoCarrito(true);
      await agregarItem(servicio.id, 1);
      alert('Servicio agregado al carrito');
    } catch (error) {
      console.error('Error al agregar al carrito:', error);
      alert('Error al agregar al carrito. Inténtalo de nuevo.');
    } finally {
      setAgregandoCarrito(false);
    }
  };

  const estaEnCarrito = () => {
    if (!servicio || !state.carrito) return false;
    return state.carrito.items.some((item: any) => item.servicio.id === servicio.id);
  };

  const formatearPrecio = (precio: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(precio);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !servicio) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'Servicio no encontrado'}
          </h2>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  const disponible = isAdmin ? true : servicio.disponible;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Link to="/catalogo" className="hover:text-blue-600">Catálogo</Link>
          <span>/</span>
          <span className="text-gray-900">{servicio.nombre}</span>
        </div>

        {/* Botón volver */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contenido principal */}
          <div className="lg:col-span-2">
            {/* Header del servicio */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <img
                    src={getServicioLogo(
                      servicio.nombre,
                      servicio.imagen || (servicio as any).logo || (servicio as any).logo_url,
                      servicio.logoUrl
                    )}
                    alt={servicio.nombre}
                    className="w-16 h-16 rounded-lg object-contain border border-gray-100 bg-gray-50"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getServicioLogo(servicio.nombre);
                    }}
                  />
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {servicio.nombre}
                    </h1>
                    <div className="flex items-center gap-4">
                      <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                        {servicio.categoria}
                      </span>
                      <span className={`inline-block text-sm px-3 py-1 rounded-full ${
                        disponible 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {disponible ? 'Disponible' : 'No disponible'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-1 mb-1">
                    <DollarSign className="h-6 w-6 text-green-600" />
                    <span className="text-3xl font-bold text-green-600">
                      {formatearPrecio(servicio.precio)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">/mes</span>
                </div>
              </div>

              {/* Estadísticas */}
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{servicio._count?.suscripciones || 0} suscriptores</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>4.5 (128 reseñas)</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Desde {new Date(servicio.createdAt).getFullYear()}</span>
                </div>
              </div>
            </div>

            {/* Descripción */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Descripción</h2>
              <p className="text-gray-700 leading-relaxed">
                {servicio.descripcion}
              </p>
            </div>

            {/* Características */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Características</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Play className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Streaming HD</h3>
                    <p className="text-sm text-gray-600">Calidad hasta 1080p</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Download className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Descarga offline</h3>
                    <p className="text-sm text-gray-600">Ve contenido sin conexión</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Shield className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Sin anuncios</h3>
                    <p className="text-sm text-gray-600">Experiencia sin interrupciones</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <Users className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Múltiples perfiles</h3>
                    <p className="text-sm text-gray-600">Hasta 4 perfiles familiares</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dispositivos compatibles */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Dispositivos compatibles</h2>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                  <Smartphone className="h-5 w-5 text-gray-600" />
                  <span className="text-sm text-gray-700">Móviles</span>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                  <Monitor className="h-5 w-5 text-gray-600" />
                  <span className="text-sm text-gray-700">Computadoras</span>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                  <Tv className="h-5 w-5 text-gray-600" />
                  <span className="text-sm text-gray-700">Smart TV</span>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                  <Globe className="h-5 w-5 text-gray-600" />
                  <span className="text-sm text-gray-700">Navegador web</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Suscripción</h3>
              
              {/* Precio destacado */}
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <span className="text-4xl font-bold text-green-600">
                    {formatearPrecio(servicio.precio)}
                  </span>
                </div>
                <p className="text-gray-600">por mes</p>
              </div>

              {/* Estado de disponibilidad */}
              {disponibilidad && (
                <div className="mb-6">
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${
                    disponibilidad.disponible || isAdmin
                      ? 'bg-green-50 text-green-800' 
                      : 'bg-red-50 text-red-800'
                  }`}>
                    {disponibilidad.disponible || isAdmin ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <X className="h-5 w-5" />
                    )}
                    <span className="text-sm font-medium">
                      {(disponibilidad.disponible || isAdmin)
                        ? 'Disponible para suscripción' 
                        : 'No disponible actualmente'
                      }
                    </span>
                  </div>
                  {disponibilidad.mensaje && (
                    <p className="text-sm text-gray-600 mt-2">
                      {disponibilidad.mensaje}
                    </p>
                  )}
                </div>
              )}

              {/* Beneficios incluidos */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Incluye:</h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Acceso completo al catálogo</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Streaming en HD</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Sin anuncios</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Cancela cuando quieras</span>
                  </li>
                </ul>
              </div>

              {/* Botones de acción */}
              {user?.role !== 'ADMINISTRADOR' && (
                <div className="space-y-3">
                  {/* Botón de agregar al carrito */}
                  <button
                    onClick={handleAgregarCarrito}
                    disabled={!disponible || agregandoCarrito || estaEnCarrito()}
                    className={`w-full py-3 px-4 rounded-md font-medium transition-colors flex items-center justify-center gap-2 ${
                      disponible && !agregandoCarrito && !estaEnCarrito()
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {agregandoCarrito ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Agregando...
                      </>
                    ) : estaEnCarrito() ? (
                      <>
                        <Check className="h-4 w-4" />
                        En el carrito
                      </>
                    ) : disponible ? (
                      user ? (
                        <>
                          <ShoppingCart className="h-4 w-4" />
                          Agregar al carrito
                        </>
                      ) : (
                        'Iniciar sesión para agregar'
                      )
                    ) : (
                      'No disponible'
                    )}
                  </button>

                  {/* Botón de suscripción directa */}
                  <button
                    onClick={handleSuscripcion}
                    disabled={!disponible || suscribiendo}
                    className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
                      disponible && !suscribiendo
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {suscribiendo ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Procesando...
                      </div>
                    ) : disponible ? (
                      user ? 'Suscribirse ahora' : 'Iniciar sesión para suscribirse'
                    ) : (
                      'No disponible'
                    )}
                  </button>

                  {!user && (
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Necesitas una cuenta para suscribirte
                    </p>
                  )}
                </div>
              )}

              {/* Garantía */}
              <div className="mt-6 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 text-center">
                  🛡️ Garantía de 30 días<br />
                  Cancela sin costo si no estás satisfecho
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CheckoutModal
        isOpen={mostrarCheckout}
        onClose={() => setMostrarCheckout(false)}
        onSuccess={() => {
          setMostrarCheckout(false);
          navigate('/dashboard');
        }}
      />
    </div>
  );
}
