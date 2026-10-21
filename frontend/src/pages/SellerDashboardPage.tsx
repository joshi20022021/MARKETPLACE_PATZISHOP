import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, useSession } from '../services/session';
import { dashboardSchema, businessStates } from '../services/seller';
import { money } from '../services/marketplace';
import { RemoteError } from '../components/RemoteState';
import { SellerNav } from '../components/SellerNav';
export function SellerDashboardPage() {
  const session = useSession();
  const result = useQuery({
    queryKey: ['seller-dashboard', session.user?.id, session.epoch],
    enabled: session.user?.role === 'SELLER',
    queryFn: async ({ signal }) =>
      dashboardSchema.parse((await api.get('/seller/dashboard', { signal })).data),
  });
  return (
    <section className="wrap marketplace-page seller-page">
      <SellerNav />
      <div className="market-heading">
        <div>
          <p className="eyebrow">TU NEGOCIO, DÍA A DÍA</p>
          <h1>
            Mi <em>panel.</em>
          </h1>
          <p>Un vistazo a tus productos y pedidos.</p>
        </div>
        <button
          className="button button-outline"
          disabled={result.isFetching}
          onClick={() => void result.refetch()}
        >
          Actualizar resumen
        </button>
      </div>
      {result.isPending ? (
        <p role="status">Cargando tu resumen…</p>
      ) : result.isError ? (
        <RemoteError error={result.error} retry={() => void result.refetch()} />
      ) : !result.data.business ? (
        <div className="form-card">
          <h2>Tu tienda empieza aquí</h2>
          <p>Crea tu negocio para preparar tus productos.</p>
          <Link className="button" to="/cuenta/tienda">
            Presentar mi tienda ↗
          </Link>
        </div>
      ) : (
        <>
          <div className="seller-business">
            <h2>{result.data.business.name}</h2>
            <span className="available-badge">{businessStates[result.data.business.status]}</span>
            <p>
              {result.data.business.status === 'ACTIVE'
                ? 'Tu tienda puede publicar productos disponibles.'
                : result.data.business.status === 'PENDING'
                  ? 'Puedes preparar productos inactivos mientras tu tienda espera revisión.'
                  : 'Tu tienda permite consulta; la edición de productos está bloqueada.'}
            </p>
          </div>
          <div className="seller-metrics">
            {[
              ['Productos', result.data.products.total],
              ['Activos (estado)', result.data.products.active],
              ['Inactivos', result.data.products.inactive],
              ['Agotados', result.data.products.outOfStock],
              ['Stock bajo (1–5)', result.data.products.lowStock],
              ['Subpedidos', result.data.orders.total],
              ['En curso', result.data.orders.open],
              ['Entregados', result.data.orders.delivered],
              ['Cancelados', result.data.orders.cancelled],
            ].map(([label, value]) => (
              <article className="metric-card" key={label}>
                <h3>{label}</h3>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
          <div className="seller-amounts">
            <article className="form-card">
              <h2>Pedidos contra entrega</h2>
              <strong>{money(result.data.orders.cashOnDeliveryTotal)}</strong>
              <p>
                Importe histórico de tus subpedidos no cancelados. No equivale a dinero cobrado.
              </p>
            </article>
            <article className="form-card">
              <h2>Pedidos simulados</h2>
              <strong>{money(result.data.orders.simulatedTotal)}</strong>
              <p>Importe de prueba no cancelado. Sin cobro de dinero real.</p>
            </article>
          </div>
          <p className="muted">
            Totales de toda la actividad de tu tienda; envío no incluido. Activo es el estado del
            producto: su visibilidad también depende de categoría, tienda y existencias.
          </p>
          <Link className="button" to="/vendedor/productos">
            Administrar productos ↗
          </Link>
        </>
      )}
    </section>
  );
}
