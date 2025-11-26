import React from 'react';

const HistorialValidacionesOCR: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              Historial de Validaciones OCR
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Visualización del historial de validaciones de comprobantes OCR
            </p>
          </div>
          <div className="p-6">
            <div className="text-center py-12">
              <div className="text-gray-500">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Sin validaciones</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Aún no hay validaciones de comprobantes registradas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistorialValidacionesOCR;