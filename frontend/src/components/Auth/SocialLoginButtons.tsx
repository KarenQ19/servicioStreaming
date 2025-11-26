import React from 'react';
import { FaGoogle, FaFacebook } from 'react-icons/fa';

interface SocialLoginButtonsProps {
  onGoogleLogin: () => void;
  onFacebookLogin: () => void;
  isLoading?: boolean;
}

const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({
  onGoogleLogin,
  onFacebookLogin,
  isLoading = false
}) => {
  const handleGoogleLogin = () => {
    if (!isLoading) {
      onGoogleLogin();
    }
  };

  const handleFacebookLogin = () => {
    if (!isLoading) {
      onFacebookLogin();
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">O continúa con</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Botón de Google */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          <FaGoogle className="h-5 w-5 text-red-500 mr-2" />
          Google
        </button>

        {/* Botón de Facebook */}
        <button
          type="button"
          onClick={handleFacebookLogin}
          disabled={isLoading}
          className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          <FaFacebook className="h-5 w-5 text-blue-600 mr-2" />
          Facebook
        </button>
      </div>
    </div>
  );
};

export default SocialLoginButtons;