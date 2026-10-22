import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, useSession } from '../services/session';
import {
  orderStatus,
  readSellerOrderFilters,
  sellerOrderListSchema,
  sellerOrderSchema,
} from '../services/orders';
import { money } from '../services/marketplace';
import { SellerNav } from '../components/SellerNav';
import { RemoteError } from '../components/RemoteState';
import { Pagination } from '../components/Pagination';
import { OrderHistory } from '../components/OrderHistory';
import { OrderStatusActions } from '../components/OrderStatusActions';
export function SellerOrdersPage() {
  const session = useSession();
  const [params, setParams] = useSearchParams();
  let filters: ReturnType<typeof readSellerOrderFilters> | null = null;
  try {
    filters = readSellerOrderFilters(params);
  } catch {
    /* Invalid filters do not issue a private query. */
  }
  const orders = useQuery({
    queryKey: ['seller-orders', session.user?.id, session.epoch, filters],
    enabled: !!filters && session.user?.role === 'SELLER',
    queryFn: async ({ signal }) =>
      sellerOrderListSchema.parse(
        (
          await api.get('/seller/orders', {
            signal,
            params: { page: filters!.page, limit: 12, status: filters!.status || undefined },
          })
        ).data,
      ),
  });
  return (
    <section className="wrap marketplace-page seller-page">
      <SellerNav />
      <div className="market-heading">
        <div>
          <p className="eyebrow">CADA ENTREGA TIENE UNA HISTORIA</p>
          <h1>
            Mis <em>pedidos.</em>
          </h1>
          <p>Solo los subpedidos que corresponden a tu tienda.</p>
        </div>
        <button
          className="button button-outline"
          disabled={orders.isFetching || !filters}
          onClick={() => void orders.refetch()}
        >
          Actualizar pedidos
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
          <div className="seller-filters">
            <label>
              Estado del pedido
              <select
                value={filters.status}
                onChange={(event) => {
                  const next = new URLSearchParams();
                  if (event.target.value) next.set('status', event.target.value);
                  setParams(next);
                }}
              >
                <option value="">Todos los estados</option>
                {Object.entries(orderStatus).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {orders.isPending ? (
            <p role="status">Cargando pedidos de tu tienda…</p>
          ) : orders.isError ? (
            <RemoteError error={orders.error} retry={() => void orders.refetch()} />
          ) : (
            <>
              <p role="status">{orders.data.meta.total} subpedidos encontrados</p>
              <div className="order-list">
                {orders.data.data.map((part) => (
                  <article className="order-list-card" key={part.id}>
                    <h2>
                      <Link to={`/vendedor/pedidos/${part.id}`}>Pedido #{part.orderNumber} ↗</Link>
                    </h2>
                    <p>{new Date(part.createdAt).toLocaleString('es-GT')}</p>
                    <span className="available-badge">{orderStatus[part.status]}</span>
                    <p>
                      Subtotal de tu tienda: <strong>{money(part.subtotal)}</strong>
                    </p>
                    <p>
                      {part.items.reduce((sum, item) => sum + item.quantity, 0)} unidades ·{' '}
                      {part.simulation ? 'Simulación sin cobro real' : 'Contra entrega'}
                    </p>
                  </article>
                ))}
              </div>
              {!orders.data.data.length && (
                <div className="remote-state">
                  <h2>No hay subpedidos en esta página</h2>
                  <p>Los nuevos pedidos aparecerán cuando un cliente confirme una compra.</p>
                </div>
              )}
              <Pagination page={filters.page} totalPages={orders.data.meta.totalPages} />
            </>
          )}
        </>
      )}
    </section>
  );
}
export function SellerOrderPage() {
  const session = useSession();
  const { id = '' } = useParams();
  const order = useQuery({
    queryKey: ['seller-order', session.user?.id, session.epoch, id],
    enabled: session.user?.role === 'SELLER',
    queryFn: async ({ signal }) =>
      sellerOrderSchema.parse(
        (await api.get(`/seller/orders/${encodeURIComponent(id)}`, { signal })).data,
      ),
  });
  const reload = async () => {
    const r = await order.refetch();
    if (r.error) throw r.error;
    return r.data;
  };
  return (
    <section className="wrap marketplace-page seller-page order-page">
      <SellerNav />
      <Link className="back-link" to="/vendedor/pedidos">
        ← Pedidos de mi tienda
      </Link>
      {order.isPending ? (
        <p role="status">Cargando subpedido…</p>
      ) : !order.data ? (
        <RemoteError
          resource="Este subpedido"
          error={order.error}
          retry={() => void order.refetch()}
        />
      ) : (
        <>
          <div className="market-heading">
            <div>
              <p className="eyebrow">LO QUE TU TIENDA PREPARA</p>
              <h1>
                Pedido <em>#{order.data.orderNumber}</em>
              </h1>
              <p>{order.data.business.name}</p>
            </div>
            <button
              className="button button-outline"
              disabled={order.isFetching}
              onClick={() => void order.refetch()}
            >
              Actualizar pedido
            </button>
          </div>
          {order.isRefetchError && (
            <p role="alert" className="form-alert">
              No se pudo actualizar el pedido. Se muestra la última información consultada.
            </p>
          )}
          <span className="available-badge">{orderStatus[order.data.status]}</span>
          {order.data.simulation && (
            <p className="form-alert">Pago simulado de prueba. Sin dinero real.</p>
          )}
          <div className="checkout-review-grid">
            <div>
              <h2>Entrega</h2>
              <p>
                {order.data.delivery.recipientName}
                <br />
                {order.data.delivery.phone}
              </p>
              <p className="preserve-text">
                {order.data.delivery.addressLine}
                <br />
                {order.data.delivery.city}, {order.data.delivery.region}
                <br />
                Guatemala {order.data.delivery.postalCode}
              </p>
              {order.data.delivery.deliveryInstructions && (
                <p className="preserve-text">{order.data.delivery.deliveryInstructions}</p>
              )}
              <p>
                Método: {order.data.simulation ? 'Simulado (prueba)' : 'Contra entrega'}. Estado de
                pago registrado:{' '}
                {order.data.paymentStatus === 'PAID'
                  ? 'Pagado en simulación'
                  : order.data.paymentStatus === 'PENDING'
                    ? 'Pendiente'
                    : order.data.paymentStatus === 'FAILED'
                      ? 'Fallido'
                      : 'Reembolsado'}
                .
              </p>
              <p>El avance o la cancelación no registra cobros ni reembolsos.</p>
            </div>
            <section className="checkout-store">
              <h2>Productos de tu tienda</h2>
              <ul>
                {order.data.items.map((item) => (
                  <li key={item.id}>
                    <span>
                      {item.quantity} × {item.productName}
                      <small> · {money(item.unitPrice)} por unidad</small>
                    </span>
                    <strong>{money(item.lineTotal)}</strong>
                  </li>
                ))}
              </ul>
              <p>
                Subtotal original: <strong>{money(order.data.subtotal)}</strong>. Envío no incluido.
              </p>
            </section>
          </div>
          <OrderStatusActions
            key={`${order.data.id}:${order.data.status}`}
            part={order.data}
            reload={reload}
          />
          <OrderHistory history={order.data.history} />
        </>
      )}
    </section>
  );
}
