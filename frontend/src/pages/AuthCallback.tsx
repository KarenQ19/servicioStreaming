import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSocialAuth } from '../hooks/useSocialAuth';

const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleAuthCallback, error } = useSocialAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const errorParam = searchParams.get('error');

    if (token) {
      handleAuthCallback(token);
    } else if (errorParam) {
      // Manejar errores de autenticación
      console.error('Error de autenticación:', errorParam);
      navigate('/login?error=' + errorParam);
    } else {
      // Si no hay token ni error, redirigir al login
      navigate('/login');
    }
  }, [searchParams, handleAuthCallback, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Error de Autenticación
            </h2>
            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Volver al Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Procesando Autenticación
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Por favor espera mientras procesamos tu inicio de sesión...
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;