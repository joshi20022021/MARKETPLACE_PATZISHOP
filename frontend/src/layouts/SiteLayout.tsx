import { Suspense, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { ShopIcon } from '../components/ShopIcon';
import { RouteNotice } from '../components/RouteNotice';
import { logout, useSession } from '../services/session';
import { errorMessage } from '../services/errors';

const navLink =
  'inline-flex min-h-11 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold text-patzi-muted transition-colors hover:bg-patzi-sage hover:text-patzi-green aria-[current=page]:bg-patzi-green aria-[current=page]:text-white';

export function SiteLayout() {
  const session = useSession();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState('');
  return (
    <>
      <RouteNotice />
      <a className="skip-link rounded-lg" href="#contenido">
        Saltar al contenido
      </a>
      <div className="bg-patzi-green px-5 py-2.5 text-center text-[8px] font-semibold tracking-[0.15em] text-patzi-cream sm:text-[10px]">
        PEQUEÑOS NEGOCIOS. GRANDES HISTORIAS.{' '}
        <span className="ml-2 text-patzi-gold" aria-hidden="true">
          ✳
        </span>{' '}
        <span className="ml-2 hidden sm:inline">PATZICÍA, GUATEMALA</span>
      </div>
      <div className="sticky top-0 z-30 border-b border-patzi-green/10 bg-patzi-cream/95 backdrop-blur-md">
        <header className="wrap flex flex-col gap-4 py-4 lg:min-h-24 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:py-5">
          <div className="flex shrink-0 items-center gap-5">
            <Brand />
            <span className="hidden border-l border-patzi-green/15 pl-5 text-[10px] leading-4 text-patzi-muted xl:block">
              El mercado de
              <br />
              <strong className="font-semibold text-patzi-green">nuestra comunidad.</strong>
            </span>
          </div>
          <nav
            aria-label="Navegación principal"
            className="flex flex-wrap items-center gap-1.5 sm:gap-2 lg:justify-end"
          >
            <NavLink className={navLink} to="/catalogo">
              Catálogo
            </NavLink>
            <NavLink className={navLink} to="/tiendas">
              Tiendas
            </NavLink>
            {(!session.user || session.user.role === 'CUSTOMER') && (
              <NavLink className={navLink} to="/carrito">
                <ShopIcon name="bag" className="size-4" />
                Carrito
              </NavLink>
            )}
            {session.user ? (
              <>
                {session.user.role === 'CUSTOMER' && (
                  <NavLink className={navLink} to="/pedidos">
                    Mis pedidos
                  </NavLink>
                )}
                {session.user.role === 'SELLER' && (
                  <NavLink className={navLink} to="/vendedor">
                    Mi panel
                  </NavLink>
                )}
                {session.user.role === 'ADMIN' && (
                  <NavLink className={navLink} to="/admin/dashboard">
                    Administración
                  </NavLink>
                )}
                <NavLink className={navLink} to="/cuenta">
                  Mi cuenta
                </NavLink>
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
                <Link className={navLink} to="/registro?tipo=vendedor">
                  Quiero vender
                </Link>
                <Link className="button button-small ml-auto lg:ml-2" to="/ingresar">
                  Ingresar <ShopIcon name="arrow" className="size-3.5" />
                </Link>
              </>
            )}
          </nav>
        </header>
      </div>
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
      <footer className="border-t border-patzi-green/10 bg-white/60">
        <div className="wrap flex flex-col justify-between gap-6 py-9 md:flex-row md:items-center md:py-12">
          <div>
            <Brand />
            <p className="mt-3 mb-0 text-xs text-patzi-muted">
              Un lugar para lo que nos hace comunidad.
            </p>
          </div>
          <div className="text-xs leading-6 text-patzi-muted md:text-right">
            <p className="mb-1 font-semibold text-patzi-green">Hecho para encontrarnos.</p>
            <span>Patzicía · Chimaltenango, Guatemala</span>
          </div>
        </div>
      </footer>
    </>
  );
}
