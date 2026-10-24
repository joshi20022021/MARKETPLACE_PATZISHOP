import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { refreshSession, useSession } from '../services/session';
export function SessionGate({
  seller = false,
  admin = false,
}: {
  seller?: boolean;
  admin?: boolean;
}) {
  const session = useSession();
  const location = useLocation();
  if (session.status === 'loading')
    return (
      <div className="wrap page-state" role="status">
        Preparando tu cuenta…
      </div>
    );
  if (session.status === 'unavailable')
    return (
      <div className="wrap page-state">
        <h1>No pudimos comprobar tu sesión</h1>
        <p>Revisa tu conexión y vuelve a intentar.</p>
        <button
          className="button"
          onClick={() => {
            useSession.setState({ status: 'loading' });
            void refreshSession().catch(() => {
              if (useSession.getState().status === 'loading')
                useSession.setState({ status: 'unavailable' });
            });
          }}
        >
          Reintentar
        </button>
      </div>
    );
  if (!session.user) return <Navigate to="/ingresar" replace state={{ from: location.pathname }} />;
  if (admin && session.user.role !== 'ADMIN')
    return (
      <div className="wrap page-state">
        <h1>Esta sección es para administradores</h1>
        <p>Tu cuenta actual no tiene acceso a la administración.</p>
      </div>
    );
  if (seller && session.user.role !== 'SELLER')
    return (
      <div className="wrap page-state">
        <h1>Esta sección es para vendedores</h1>
        <p>Tu cuenta actual no tiene acceso a una tienda.</p>
      </div>
    );
  return <Outlet />;
}
