import { useAuth } from '../hooks/useAuth';

export default function DebugInfo() {
  const { user, isAuthenticated, token } = useAuth();

  return (
    <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-400 rounded-lg p-4 max-w-sm z-50">
      <h3 className="font-bold text-yellow-800 mb-2">Debug Info</h3>
      <div className="text-sm text-yellow-700">
        <p><strong>Autenticado:</strong> {isAuthenticated ? 'Sí' : 'No'}</p>
        <p><strong>Token:</strong> {token ? 'Presente' : 'Ausente'}</p>
        <p><strong>Usuario:</strong> {user ? user.nombre : 'No disponible'}</p>
        <p><strong>Email:</strong> {user ? user.email : 'No disponible'}</p>
        <p><strong>Rol:</strong> {user ? user.role : 'No disponible'}</p>
        <p><strong>ID:</strong> {user ? user.id : 'No disponible'}</p>
      </div>
    </div>
  );
}