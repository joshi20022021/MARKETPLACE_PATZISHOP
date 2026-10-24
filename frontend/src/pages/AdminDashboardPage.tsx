import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, useSession } from '../services/session';
import { adminDashboardSchema } from '../services/admin';
import { money } from '../services/marketplace';
import { AdminNav } from '../components/AdminNav';
import { RemoteError } from '../components/RemoteState';
export function AdminDashboardPage() {
  const session = useSession();
  const result = useQuery({
    queryKey: ['admin-dashboard', session.user?.id, session.epoch],
    enabled: session.user?.role === 'ADMIN',
    queryFn: async ({ signal }) =>
      adminDashboardSchema.parse((await api.get('/admin/dashboard', { signal })).data),
  });
  const value = result.data;
  return (
    <section className="wrap marketplace-page seller-page">
      <AdminNav />
      <div className="market-heading">
        <div>
          <p className="eyebrow">EL COMERCIO DE NUESTRA COMUNIDAD</p>
          <h1>
            Panel <em>administrador.</em>
          </h1>
          <p>Actividad global de PatziShop.</p>
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
        <p role="status">Cargando resumen global…</p>
      ) : result.isError || !value ? (
        <RemoteError error={result.error} retry={() => void result.refetch()} />
      ) : (
        <>
          <div className="seller-metrics">
            {[
              ['Usuarios registrados', value.users.total],
              ['Usuarios activos', value.users.active],
              ['Vendedores', value.users.sellers],
              ['Clientes', value.users.customers],
              ['Administradores', value.users.admins],
              ['Tiendas', value.businesses.total],
              ['Tiendas activas', value.businesses.active],
              ['Tiendas en revisión', value.businesses.pending],
              ['Tiendas suspendidas', value.businesses.suspended],
              ['Tiendas no aprobadas', value.businesses.rejected],
              ['Productos', value.products.total],
              ['Productos publicados', value.products.published],
              ['Compras', value.orders.total],
              ['Subpedidos', value.orders.sellerOrders],
              ['En curso', value.orders.open],
              ['Entregados', value.orders.delivered],
              ['Cancelados', value.orders.cancelled],
            ].map(([label, n]) => (
              <article className="metric-card" key={label}>
                <h3>{label}</h3>
                <strong>{n}</strong>
              </article>
            ))}
          </div>
          <div className="seller-amounts">
            <article className="form-card">
              <h2>Importe contra entrega</h2>
              <strong>{money(value.orders.cashOnDeliveryTotal)}</strong>
              <p>Suma histórica de subpedidos no cancelados. No equivale a dinero cobrado.</p>
            </article>
            <article className="form-card">
              <h2>Importe simulado</h2>
              <strong>{money(value.orders.simulatedTotal)}</strong>
              <p>Importe de prueba no cancelado. Sin dinero real.</p>
            </article>
          </div>
          <p className="muted">
            Toda la actividad, sin envío. Los estados de pedidos corresponden a subpedidos; cada
            compra se cuenta una sola vez. Tienda activa indica su estado; productos publicados
            aplica también stock, categoría y vendedor vigentes.
          </p>
          <Link className="button" to="/admin/negocios?status=PENDING">
            Revisar tiendas pendientes ↗
          </Link>
        </>
      )}
    </section>
  );
}
