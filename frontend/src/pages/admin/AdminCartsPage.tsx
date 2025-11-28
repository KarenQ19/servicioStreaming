import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Link } from 'react-router-dom';

type CarritoItem = {
  cantidad?: number;
  precio?: number;
  servicio?: { nombre?: string; precio?: number };
};

type Carrito = {
  id: string;
  activo?: boolean;
  updatedAt?: string;
  createdAt?: string;
  items?: CarritoItem[];
};

type Cliente = {
  id: string;
  nombre?: string;
  email?: string;
};

type CarritoRow = {
  cliente: Cliente;
  carrito: Carrito;
  total: number;
  itemsCount: number;
};

const AdminCartsPage: React.FC = () => {
  const [rows, setRows] = useState<CarritoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value || 0);

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        setError(null);
        // Traer clientes (limitado para no saturar)
        const { clientes = [] } = await adminService.consultarClientes({ limit: 20 } as any);
        const carritos: CarritoRow[] = [];
        for (const cli of clientes) {
          try {
            const data = await adminService.consultarCarritoCliente(cli.id);
            (data.carritos || []).forEach((car: Carrito) => {
              const total = (car.items || []).reduce((sum, it) => {
                const precio = it.precio ?? it.servicio?.precio ?? 0;
                const cant = it.cantidad ?? 1;
                return sum + precio * cant;
              }, 0);
              const itemsCount = (car.items || []).reduce((sum, it) => sum + (it.cantidad ?? 1), 0);
              carritos.push({
                cliente: { id: cli.id, nombre: cli.nombre, email: cli.email },
                carrito: car,
                total,
                itemsCount,
              });
            });
          } catch (err) {
            console.error('Error cargando carrito de cliente', cli.id, err);
          }
        }
        setRows(carritos);
      } catch (err: any) {
        console.error('Error al cargar carritos:', err);
        setError(err?.message || 'No se pudieron cargar los carritos');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Carritos</h1>
          <p className="text-gray-600">Administra los carritos de compras de los clientes</p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading && (
          <div className="p-10 text-center text-gray-600">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            Cargando carritos...
          </div>
        )}
        {error && (
          <div className="p-6 text-red-600">{error}</div>
        )}
        {!loading && !error && rows.length === 0 && (
          <div className="p-10 text-center text-gray-500">
            No hay carritos registrados.
          </div>
        )}
        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actualizado</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((row) => (
                  <tr key={`${row.cliente.id}-${row.carrito.id}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-700">
                      <div className="font-medium text-gray-900">{row.cliente.nombre || 'Cliente'}</div>
                      <div className="text-xs text-gray-500">{row.cliente.email}</div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">{row.itemsCount} artículos</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{formatCurrency(row.total)}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        row.carrito.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {row.carrito.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {row.carrito.updatedAt ? new Date(row.carrito.updatedAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      <Link
                        to={`/admin/clientes?cliente=${row.cliente.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                        state={{ cliente: row.cliente }}
                      >
                        Ver cliente
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCartsPage;
