import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Home() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-sm px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Plataforma activa y segura para tus suscripciones
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
                {isAuthenticated
                  ? `Hola ${user?.nombre || 'cliente'}, organiza y paga en segundos`
                  : 'Gestiona tus servicios de streaming sin complicaciones'}
              </h1>
              <p className="text-lg text-white/80 max-w-2xl">
                Centraliza tus pagos, credenciales y suscripciones en un solo lugar. Seguimiento en tiempo real, validación de comprobantes y métricas claras para que nunca pierdas control.
              </p>
              {isAuthenticated && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Link to="/dashboard" className="bg-white text-gray-900 rounded-xl p-4 shadow hover:shadow-lg transition flex flex-col gap-1">
                    <span className="text-sm text-gray-500">Dashboard</span>
                    <span className="text-lg font-semibold">Suscripciones y accesos</span>
                  </Link>
                  <Link to="/historial-pagos" className="bg-white/10 border border-white/20 rounded-xl p-4 hover:bg-white/15 transition flex flex-col gap-1">
                    <span className="text-sm text-white/70">Pagos</span>
                    <span className="text-lg font-semibold text-white">Historial y estados</span>
                  </Link>
                  <Link to="/catalogo" className="bg-white/10 border border-white/20 rounded-xl p-4 hover:bg-white/15 transition flex flex-col gap-1">
                    <span className="text-sm text-white/70">Catálogo</span>
                    <span className="text-lg font-semibold text-white">Explorar servicios</span>
                  </Link>
                </div>
              )}
              {!isAuthenticated && (
                <p className="text-white/80">
                  Inicia sesión desde la barra superior para continuar donde lo dejaste.
                </p>
              )}
            </div>
            <div className="lg:col-span-5">
              <div className="bg-white text-gray-900 rounded-2xl shadow-xl p-6 space-y-4">
                <p className="text-sm text-gray-500">Instantáneas del sistema</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-gray-50">
                    <p className="text-sm text-gray-500">Validaciones OCR</p>
                    <p className="text-2xl font-bold text-green-600">Automático</p>
                    <p className="text-xs text-gray-500 mt-1">Sube comprobantes y valida al instante</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50">
                    <p className="text-sm text-gray-500">Pagos QR y Transferencia</p>
                    <p className="text-2xl font-bold text-blue-600">Listos</p>
                    <p className="text-xs text-gray-500 mt-1">Configura una sola vez y cobra al vuelo</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 col-span-2">
                    <p className="text-sm text-gray-500">Métricas en vivo</p>
                    <p className="text-lg font-semibold">Suscripciones, ingresos y pendientes en un panel claro.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              ¿Por qué elegir nuestra plataforma?
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Simplifica tu experiencia de streaming con nuestras características únicas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Gestión Centralizada
              </h3>
              <p className="text-gray-600">
                Administra todas tus suscripciones de streaming desde una sola plataforma
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Descubrimiento Inteligente
              </h3>
              <p className="text-gray-600">
                Encuentra nuevo contenido basado en tus preferencias y historial
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Ahorro Inteligente
              </h3>
              <p className="text-gray-600">
                Optimiza tus gastos y encuentra las mejores ofertas en servicios de streaming
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
