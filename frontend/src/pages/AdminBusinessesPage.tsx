import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, useSession } from '../services/session';
import {
  adminActions,
  adminBusinessesSchema,
  adminBusinessSchema,
  readAdminFilters,
  useAdminBusiness,
  type AdminBusiness,
} from '../services/admin';
import { businessStates } from '../services/seller';
import { errorMessage } from '../services/errors';
import { AdminNav } from '../components/AdminNav';
import { Pagination } from '../components/Pagination';
import { RemoteError } from '../components/RemoteState';
export function AdminBusinessesPage() {
  const session = useSession();
  const [params, setParams] = useSearchParams();
  let filters: ReturnType<typeof readAdminFilters> | null = null;
  try {
    filters = readAdminFilters(params);
  } catch {
    /* Invalid links never send private queries. */
  }
  const result = useQuery({
    queryKey: ['admin-businesses', session.user?.id, session.epoch, filters],
    enabled: !!filters && session.user?.role === 'ADMIN',
    queryFn: async ({ signal }) =>
      adminBusinessesSchema.parse(
        (
          await api.get('/admin/businesses', {
            signal,
            params: {
              page: filters!.page,
              limit: 12,
              status: filters!.status || undefined,
              search: filters!.search || undefined,
            },
          })
        ).data,
      ),
  });
  return (
    <section className="wrap marketplace-page seller-page">
      <AdminNav />
      <div className="market-heading">
        <div>
          <p className="eyebrow">UN ESPACIO PARA CADA NEGOCIO</p>
          <h1>
            Revisión de <em>tiendas.</em>
          </h1>
          <p>Consulta sus datos antes de decidir.</p>
        </div>
        <button
          className="button button-outline"
          disabled={!filters || result.isFetching}
          onClick={() => void result.refetch()}
        >
          Actualizar tiendas
        </button>
      </div>
      {!filters ? (
        <div className="remote-state">
          <h2>Revisa los filtros del enlace</h2>
          <button className="button" onClick={() => setParams({})}>
            Restablecer filtros
          </button>
        </div>
      ) : (
        <>
          <form
            className="seller-filters"
            key={`${filters.search}:${filters.status}`}
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const next = new URLSearchParams();
              const search = String(data.get('search') ?? '').trim();
              const status = String(data.get('status') ?? '');
              if (search) next.set('search', search);
              if (status) next.set('status', status);
              setParams(next);
            }}
          >
            <label>
              Nombre o identificador de tienda
              <input name="search" defaultValue={filters.search} maxLength={120} />
            </label>
            <label>
              Estado de la tienda
              <select name="status" defaultValue={filters.status}>
                <option value="">Todos los estados</option>
                {Object.entries(businessStates).map(([state, label]) => (
                  <option key={state} value={state}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button className="button" type="submit">
              Aplicar filtros
            </button>
          </form>
          {result.isPending ? (
            <p role="status">Cargando tiendas…</p>
          ) : result.isError ? (
            <RemoteError error={result.error} retry={() => void result.refetch()} />
          ) : (
            <>
              <p role="status">{result.data.meta.total} tiendas encontradas</p>
              <div className="order-list">
                {result.data.data.map((row) => (
                  <article className="order-list-card" key={row.id}>
                    <h2>
                      <Link to={`/admin/negocios/${row.id}`}>{row.name} ↗</Link>
                    </h2>
                    <span className="available-badge">{businessStates[row.status]}</span>
                    <p>{row.slug}</p>
                    <p>Responsable: {row.owner.name}</p>
                    <p>{new Date(row.createdAt).toLocaleDateString('es-GT')}</p>
                  </article>
                ))}
              </div>
              {!result.data.data.length && (
                <div className="remote-state">
                  <h2>No hay tiendas en esta página</h2>
                  <p>Prueba otros filtros o vuelve a la página anterior.</p>
                </div>
              )}
              <Pagination page={filters.page} totalPages={result.data.meta.totalPages} />
            </>
          )}
        </>
      )}
    </section>
  );
}
function ReviewBusiness({
  business,
  reload,
}: {
  business: AdminBusiness;
  reload: () => Promise<unknown>;
}) {
  const session = useSession();
  const cache = useQueryClient();
  const mounted = useRef(true);
  const lock = useRef(false);
  const [target, setTarget] = useState<AdminBusiness['status'] | ''>('');
  const [review, setReview] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const current = () => mounted.current && useSession.getState().epoch === session.epoch;
  return (
    <section className="order-status-actions">
      <h2>Decisión sobre la tienda</h2>
      {error && (
        <p className="form-alert" role="alert">
          {error}
        </p>
      )}
      {blocked ? (
        <>
          <p>Consulta el estado actual antes de enviar otra decisión.</p>
          <button
            className="button"
            disabled={busy}
            onClick={async () => {
              if (lock.current) return;
              lock.current = true;
              setBusy(true);
              try {
                await reload();
                if (current()) {
                  setBlocked(false);
                  setReview(false);
                  setError('');
                }
              } catch {
                if (current())
                  setError('No se pudo consultar la tienda. Intenta consultar de nuevo.');
              } finally {
                lock.current = false;
                if (current()) setBusy(false);
              }
            }}
          >
            Consultar estado actual
          </button>
        </>
      ) : !review ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (target && business.allowedStatuses.includes(target)) setReview(true);
          }}
        >
          <div className="field">
            <label htmlFor="business-decision">Próximo estado</label>
            <select
              id="business-decision"
              value={target}
              onChange={(event) => setTarget(event.target.value as typeof target)}
              disabled={busy}
            >
              <option value="">Selecciona una decisión</option>
              {business.allowedStatuses.map((state) => (
                <option key={state} value={state}>
                  {adminActions[state]}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="button button-outline" disabled={!target || busy}>
            Revisar decisión
          </button>
        </form>
      ) : (
        <>
          <p className="checkout-notice">
            Vas a cambiar {business.name} de {businessStates[business.status]} a{' '}
            <strong>{target && businessStates[target]}</strong>.
          </p>
          <p>
            {target === 'ACTIVE'
              ? 'Sus productos disponibles podrán volver a mostrarse si cumplen las reglas del catálogo. No se activan borradores.'
              : target === 'SUSPENDED' || target === 'REJECTED'
                ? 'La tienda y sus productos dejarán de mostrarse al público. Sus pedidos e inventario se conservarán.'
                : 'La tienda volverá a revisión. El vendedor podrá preparar productos inactivos.'}
          </p>
          <button
            className="button"
            disabled={busy}
            onClick={async () => {
              if (lock.current || !target) return;
              lock.current = true;
              setBusy(true);
              setError('');
              try {
                adminBusinessSchema.parse(
                  (
                    await api.patch(`/admin/businesses/${business.id}/status`, {
                      status: target,
                      expectedStatus: business.status,
                      expectedUpdatedAt: business.updatedAt,
                    })
                  ).data,
                );
                if (!current()) return;
                for (const key of [
                  'admin-dashboard',
                  'admin-businesses',
                  'admin-business',
                  'public-products',
                  'public-product',
                  'public-stores',
                  'public-store',
                  'seller-business',
                  'seller-dashboard',
                  'shop',
                  'cart',
                  'checkout-options',
                ])
                  void cache.invalidateQueries({ queryKey: [key], refetchType: 'none' });
                await reload();
                if (current()) {
                  setReview(false);
                  setTarget('');
                }
              } catch (cause) {
                if (current()) {
                  setError(`${errorMessage(cause)} Consulta la tienda antes de continuar.`);
                  setBlocked(true);
                }
              } finally {
                lock.current = false;
                if (current()) setBusy(false);
              }
            }}
          >
            {busy ? 'Guardando decisión…' : 'Confirmar decisión'}
          </button>
          <button
            className="button button-outline"
            disabled={busy}
            onClick={() => setReview(false)}
          >
            Volver a editar
          </button>
        </>
      )}
    </section>
  );
}
export function AdminBusinessPage() {
  const { id = '' } = useParams();
  const result = useAdminBusiness(id);
  const business = result.data;
  const reload = async () => {
    const r = await result.refetch();
    if (r.error) throw r.error;
    return r.data;
  };
  return (
    <section className="wrap marketplace-page seller-page">
      <AdminNav />
      <Link className="back-link" to="/admin/negocios">
        ← Revisión de tiendas
      </Link>
      {result.isPending ? (
        <p role="status">Cargando tienda…</p>
      ) : !business ? (
        <RemoteError
          resource="Esta tienda"
          error={result.error}
          retry={() => void result.refetch()}
        />
      ) : (
        <>
          <div className="market-heading">
            <div>
              <p className="eyebrow">REVISIÓN DEL NEGOCIO</p>
              <h1>{business.name}</h1>
              <span className="available-badge">{businessStates[business.status]}</span>
            </div>
            <button
              className="button button-outline"
              disabled={result.isFetching}
              onClick={() => void result.refetch()}
            >
              Actualizar tienda
            </button>
          </div>
          {result.isRefetchError && (
            <p role="alert" className="form-alert">
              No se pudo actualizar la tienda. Se muestran los últimos datos consultados.
            </p>
          )}
          <div className="checkout-review-grid">
            <section className="form-card">
              <h2>Datos del negocio</h2>
              <p>Identificador público: {business.slug}</p>
              <p className="preserve-text">{business.description || 'Sin descripción'}</p>
              <p>
                {business.email}
                <br />
                {business.phone}
              </p>
              <p className="preserve-text">{business.address}</p>
              <p>Registrada: {new Date(business.createdAt).toLocaleString('es-GT')}</p>
              <p>Actualizada: {new Date(business.updatedAt).toLocaleString('es-GT')}</p>
            </section>
            <section className="form-card">
              <h2>Responsable</h2>
              <p>{business.owner.name}</p>
              <p>
                {business.owner.role === 'SELLER' && business.owner.isActive
                  ? 'Vendedor activo'
                  : 'El responsable no es un vendedor activo. La aprobación no está disponible.'}
              </p>
              <p>
                La revisión afecta a la publicación de la tienda. No modifica productos, pedidos ni
                pagos.
              </p>
            </section>
          </div>
          <ReviewBusiness
            key={`${business.id}:${business.updatedAt}`}
            business={business}
            reload={reload}
          />
        </>
      )}
    </section>
  );
}
