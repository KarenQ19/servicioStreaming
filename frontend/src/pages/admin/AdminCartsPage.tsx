import React from 'react';

const AdminCartsPage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Carritos</h1>
        <p className="text-gray-600">Administra los carritos de compras de los clientes</p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5-6M20 13v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Gestión de Carritos</h3>
          <p className="text-gray-500">Esta funcionalidad estará disponible próximamente</p>
        </div>
      </div>
    </div>
  );
};

export default AdminCartsPage;