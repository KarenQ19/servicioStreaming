import React, { useEffect, useState } from 'react';
import { validacionOCRService } from '../services/validacionOCRService';
import { useAuth } from '../hooks/useAuth';

interface ValidacionListItem {
  id: string;
  imagenUrl: string;
  esValido: boolean;
  porcentajeCoincidencia: number;
  coincidencias: {
    monto: boolean;
    fecha: boolean;
    referencia: boolean;
    transaccion: boolean;
  };
  datosExtraidos: {
    monto?: string;
    fecha?: string;
    referencia?: string;
  };
  pago: {
    id: string;
    monto: number;
    descripcion: string;
    createdAt: string;
    cliente?: {
      id: string;
      nombre: string;
      email: string;
    };
    suscripcion?: {
      servicio?: {
        id: string;
        nombre: string;
      };
    };
    carrito?: {
      items: Array<{
        servicio: { id: string; nombre: string };
      }>;
    };
  };
  createdAt: string;
}

const HistorialValidacionesOCR: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ValidacionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalUrl, setModalUrl] = useState<string | null>(null);
  const [modalEsPdf, setModalEsPdf] = useState<boolean>(false);
  const [modalCargando, setModalCargando] = useState<boolean>(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        const resp = user?.role === 'ADMINISTRADOR'
          ? await validacionOCRService.obtenerHistorialAdmin({ page: 1, limit: 20 })
          : await validacionOCRService.obtenerHistorial({ page: 1, limit: 20 });
        setItems(resp?.validaciones || []);
      } catch (err: any) {
        console.error('Error cargando historial OCR:', err);
        setError(err?.message || 'Error al cargar historial');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [user?.role]);

  const formatearFecha = (fecha: string) =>
    new Date(fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });

  const isAdmin = user?.role === 'ADMINISTRADOR';

  const abrirComprobante = async (id: string) => {
    try {
      setError(null);
      setModalCargando(true);
      const blob = isAdmin
        ? await validacionOCRService.descargarImagenAdmin(id)
        : await validacionOCRService.descargarImagen(id);
      const url = window.URL.createObjectURL(blob);
      setModalEsPdf(blob.type?.toLowerCase().includes('pdf'));
      setModalUrl(url);
      setModalCargando(false);
    } catch (err: any) {
      console.error('Error abriendo comprobante:', err);
      setError(err?.message || 'No se pudo abrir el comprobante');
      setModalCargando(false);
    }
  };

  const cerrarModal = () => {
    if (modalUrl) {
      window.URL.revokeObjectURL(modalUrl);
    }
    setModalUrl(null);
    setModalEsPdf(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Historial de Validaciones OCR
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Visualiza tus comprobantes validados y su estado.
            </p>
          </div>
          <div className="p-6">
            {loading && <p className="text-gray-600">Cargando historial...</p>}
            {error && (
              <div className="text-red-600">
                {error}
              </div>
            )}
            {!loading && !error && items.length === 0 && (
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
            )}
            {!loading && !error && items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      {isAdmin && (
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                      )}
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Servicio</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referencia</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coincidencia</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      {isAdmin && (
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comprobante</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item) => {
                      const servicioNombre = (() => {
                        if (item.pago?.suscripcion?.servicio?.nombre) return item.pago.suscripcion.servicio.nombre;
                        const nombresCarrito = item.pago?.carrito?.items
                          ?.map((i) => i.servicio?.nombre)
                          .filter(Boolean)
                          .join(', ');
                        if (nombresCarrito) return nombresCarrito;
                        if (item.pago?.descripcion) return item.pago.descripcion;
                        return 'Servicio no disponible';
                      })();
                      return (
                        <tr key={item.id} className="hover:bg-blue-50/40 transition">
                          <td className="px-4 py-2 text-sm text-gray-700">{formatearFecha(item.createdAt)}</td>
                          {isAdmin && (
                            <td className="px-4 py-2 text-sm text-gray-700">
                              {item.pago?.cliente?.nombre || '—'}
                              <div className="text-xs text-gray-500">{item.pago?.cliente?.email}</div>
                            </td>
                          )}
                          <td className="px-4 py-2 text-sm text-gray-700">{servicioNombre}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">${item.datosExtraidos.monto || item.pago?.monto}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{item.datosExtraidos.referencia || '—'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{item.porcentajeCoincidencia.toFixed(0)}%</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.esValido ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {item.esValido ? 'Válido' : 'Inválido'}
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-2 text-sm">
                              <button
                                type="button"
                                onClick={() => abrirComprobante(item.id)}
                                className="text-blue-600 underline hover:text-blue-800"
                              >
                                Ver comprobante
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        {(modalCargando || modalUrl) && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="text-lg font-semibold text-gray-800">Comprobante</h3>
                <button
                  onClick={cerrarModal}
                  className="text-gray-500 hover:text-gray-800 text-sm px-2 py-1"
                >
                  Cerrar
                </button>
              </div>
              <div className="p-4 bg-gray-50 min-h-[300px] flex items-center justify-center">
                {modalCargando && <p className="text-gray-600">Cargando comprobante...</p>}
                {!modalCargando && modalUrl && (
                  modalEsPdf ? (
                    <iframe
                      src={modalUrl}
                      title="Comprobante"
                      className="w-full h-[70vh] border rounded-lg"
                    />
                  ) : (
                    <img
                      src={modalUrl}
                      alt="Comprobante"
                      className="max-h-[70vh] max-w-full object-contain rounded-lg shadow"
                    />
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistorialValidacionesOCR;
