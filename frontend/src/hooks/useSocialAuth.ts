import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const useSocialAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleGoogleLogin = useCallback(() => {
    setIsLoading(true);
    setError(null);
    
    // Redirigir a la ruta de autenticación de Google en el backend
    window.location.href = `${API_BASE_URL}/auth/google`;
  }, []);

  const handleFacebookLogin = useCallback(() => {
    setIsLoading(true);
    setError(null);
    
    // Redirigir a la ruta de autenticación de Facebook en el backend
    window.location.href = `${API_BASE_URL}/auth/facebook`;
  }, []);

  const handleAuthCallback = useCallback((token: string) => {
    try {
      // Guardar el token en localStorage
      localStorage.setItem('token', token);
      
      // Redirigir al dashboard o página principal
      navigate('/dashboard');
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error al procesar la autenticación:', error);
      setError('Error al procesar la autenticación');
      setIsLoading(false);
    }
  }, [navigate]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    handleGoogleLogin,
    handleFacebookLogin,
    handleAuthCallback,
    clearError
  };
};