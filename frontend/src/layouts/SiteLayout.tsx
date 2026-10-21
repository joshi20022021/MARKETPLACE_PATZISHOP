import { Suspense, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { RouteNotice } from '../components/RouteNotice';
import { logout, useSession } from '../services/session';
import { errorMessage } from '../services/errors';
export function SiteLayout() {
  const session = useSession();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState('');
  return (
    <>
      <RouteNotice />
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <div className="announcement">
        DE PATZICÍA, PARA NUESTRA COMUNIDAD <span>✦</span>
      </div>
      <header className="site-header wrap">
        <Brand />
        <nav aria-label="Navegación principal">
          <Link className="nav-link" to="/catalogo">
            Catálogo
          </Link>
          <Link className="nav-link" to="/tiendas">
            Tiendas
          </Link>
          {(!session.user || session.user.role === 'CUSTOMER') && (
            <Link className="nav-link" to="/carrito">
              Carrito
            </Link>
          )}
          {session.user ? (
            <>
              {session.user.role === 'CUSTOMER' && (
                <Link className="nav-link" to="/pedidos">
                  Mis pedidos
                </Link>
              )}
              {session.user.role === 'SELLER' && (
                <Link className="nav-link" to="/vendedor">
                  Mi panel
                </Link>
              )}
              <Link className="nav-link" to="/cuenta">
                Mi cuenta
              </Link>
              <button
                className="button button-small"
                disabled={leaving}
                onClick={async () => {
                  setLeaving(true);
                  setError('');
                  try {
                    await logout();
                    navigate('/');
                  } catch (cause) {
                    setError(errorMessage(cause));
                  } finally {
                    setLeaving(false);
                  }
                }}
              >
                {leaving ? 'Saliendo…' : 'Salir'}
              </button>
            </>
          ) : (
            <>
              <Link className="nav-link" to="/registro?tipo=vendedor">
                Quiero vender
              </Link>
              <Link className="button button-small" to="/ingresar">
                Ingresar <span aria-hidden="true">↗</span>
              </Link>
            </>
          )}
        </nav>
      </header>
      {error && (
        <p className="form-alert wrap" role="alert">
          {error}
        </p>
      )}
      <main id="contenido" tabIndex={-1}>
        <Suspense
          fallback={
            <p className="wrap page-state" role="status">
              Cargando página…
            </p>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <footer className="site-footer wrap">
        <Brand />
        <p>Nuestro comercio, más cerca.</p>
        <span>Patzicía · Chimaltenango, Guatemala</span>
      </footer>
    </>
  );
}
