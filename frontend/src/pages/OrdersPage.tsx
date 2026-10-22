import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, useSession } from '../services/session';
import { orderListSchema, orderSchema, orderStatus } from '../services/orders';
import { money } from '../services/marketplace';
import { RemoteError } from '../components/RemoteState';
import { Pagination } from '../components/Pagination';
import { OrderHistory } from '../components/OrderHistory';
import { OrderStatusActions } from '../components/OrderStatusActions';
export function OrdersPage() {
  const session = useSession();
  const [params, setParams] = useSearchParams();
  const raw = params.get('page') ?? '1';
  const page = Number(raw);
  const valid =
    /^\d+$/u.test(raw) && page >= 1 && page <= 10000 && params.getAll('page').length <= 1;
  const orders = useQuery({
    queryKey: ['orders', session.user?.id, session.epoch, page],
    enabled: valid && session.user?.role === 'CUSTOMER',
    queryFn: async ({ signal }) =>
      orderListSchema.parse(
        (await api.get('/orders', { params: { page, limit: 12 }, signal })).data,
      ),
  });
  if (session.user?.role !== 'CUSTOMER') return <OrderRoleNotice />;
  if (!valid)
    return (
      <section className="wrap page-state">
        <h1>Revisa la página del enlace</h1>
        <button className="button" onClick={() => setParams({})}>
          Volver al inicio
        </button>
      </section>
    );
  return (
    <section className="wrap marketplace-page">
      <div className="market-heading">
        <div>
          <p className="eyebrow">TUS COMPRAS LOCALES</p>
          <h1>
            Mis <em>pedidos.</em>
          </h1>
        </div>
      </div>
      {orders.isPending ? (
        <p role="status">Cargando pedidos…</p>
      ) : orders.isError ? (
        <RemoteError error={orders.error} retry={() => void orders.refetch()} />
      ) : (
        <>
          {!orders.data.data.length ? (
            <div className="remote-state">
              <h2>No hay pedidos en esta página</h2>
              <Link className="button" to="/catalogo">
                Explorar productos
              </Link>
            </div>
          ) : (
            <div className="order-list">
              {orders.data.data.map((order) => (
                <article className="order-list-card" key={order.id}>
                  <h2>
                    <Link to={`/pedidos/${order.id}`}>Pedido #{order.number} ↗</Link>
                  </h2>
                  <p>
                    {new Date(order.createdAt).toLocaleDateString('es-GT')} ·{' '}
                    {order.sellerOrders.length} tiendas
                  </p>
                  <strong>{money(order.total)}</strong>
                  {order.activeProductsTotal !== undefined &&
                    order.activeProductsTotal !== order.total && (
                      <p>Productos no cancelados: {money(order.activeProductsTotal)}</p>
                    )}
                  <ul>
                    {order.sellerOrders.map((group) => (
                      <li key={group.id}>
                        {group.business.name}: {orderStatus[group.status]}
                      </li>
                    ))}
                  </ul>
                  <p>
                    {order.simulation ? 'Pago simulado · sin cobro real' : 'Pago contra entrega'}
                  </p>
                </article>
              ))}
            </div>
          )}
          <Pagination page={page} totalPages={orders.data.meta.totalPages} />
        </>
      )}
    </section>
  );
}
export function OrderPage() {
  const session = useSession();
  const { id = '' } = useParams();
  const order = useQuery({
    queryKey: ['order', session.user?.id, session.epoch, id],
    enabled: session.user?.role === 'CUSTOMER',
    queryFn: async ({ signal }) =>
      orderSchema.parse((await api.get(`/orders/${encodeURIComponent(id)}`, { signal })).data),
  });
  if (session.user?.role !== 'CUSTOMER') return <OrderRoleNotice />;
  if (order.isPending)
    return (
      <p className="wrap page-state" role="status">
        Cargando tu pedido…
      </p>
    );
  if (!order.data)
    return (
      <section className="wrap page-state">
        <RemoteError
          resource="Este pedido"
          error={order.error}
          retry={() => void order.refetch()}
        />
        <Link className="text-link" to="/pedidos">
          Mis pedidos ↗
        </Link>
      </section>
    );
  const value = order.data;
  const reload = async () => {
    const result = await order.refetch();
    if (result.error) throw result.error;
    return result.data;
  };
  return (
    <section className="wrap marketplace-page order-page">
      <Link className="back-link" to="/pedidos">
        ← Mis pedidos
      </Link>
      <div className="market-heading">
        <div>
          <p className="eyebrow">GRACIAS POR COMPRAR CERCA</p>
          <h1>
            Pedido <em>#{value.number}</em>
          </h1>
        </div>
        <button
          className="button button-outline"
          disabled={order.isFetching}
          onClick={() => void order.refetch()}
        >
          Actualizar pedido
        </button>
      </div>
      <p role="status" className="checkout-notice">
        Tu pedido está registrado. Consulta el avance de cada tienda y su historial.
      </p>
      {order.isRefetchError && (
        <p role="alert" className="form-alert">
          No se pudo actualizar el pedido. Se muestra la última información consultada.
        </p>
      )}
      {value.simulation && (
        <p className="form-alert">Pago simulado de prueba. No se cobró dinero real.</p>
      )}
      <div className="checkout-review-grid">
        <div>
          <h2>Tu entrega</h2>
          <p>
            {value.delivery.recipientName}
            <br />
            {value.delivery.phone}
          </p>
          <p className="preserve-text">
            {value.delivery.addressLine}
            <br />
            {value.delivery.city}, {value.delivery.region}
            <br />
            Guatemala {value.delivery.postalCode}
          </p>
          {value.delivery.deliveryInstructions && (
            <p className="preserve-text">{value.delivery.deliveryInstructions}</p>
          )}
          <h2>Pago</h2>
          <p>
            {value.simulation ? 'Simulado (prueba)' : 'Contra entrega'} ·{' '}
            {value.paymentStatus === 'PAID'
              ? 'Pagado en simulación'
              : value.paymentStatus === 'PENDING'
                ? 'Pendiente'
                : value.paymentStatus === 'FAILED'
                  ? 'Fallido'
                  : 'Reembolsado'}
          </p>
          <p>
            Total original de productos: <strong>{money(value.total)}</strong>
          </p>
          {value.activeProductsTotal !== undefined && (
            <p>
              Productos no cancelados: <strong>{money(value.activeProductsTotal)}</strong>
            </p>
          )}
          <p>El envío no está incluido en este importe.</p>
          <p>
            El estado de pago es histórico. Cancelar un subpedido no ejecuta cobros ni reembolsos.
          </p>
        </div>
        <div>
          <h2>Por tienda</h2>
          {value.sellerOrders.map((group) => (
            <section className="checkout-store" key={group.id}>
              <h3>{group.business.name}</h3>
              <span className="available-badge">{orderStatus[group.status]}</span>
              <ul>
                {group.items.map((item) => (
                  <li key={item.id}>
                    <span>
                      {item.quantity} × {item.productName}
                      <small> · {money(item.unitPrice)} por unidad</small>
                    </span>
                    <strong>{money(item.lineTotal)}</strong>
                  </li>
                ))}
              </ul>
              <p>Subtotal: {money(group.subtotal)}</p>
              <OrderStatusActions
                key={`${group.id}:${group.status}`}
                part={group}
                customer
                reload={reload}
              />
              <OrderHistory history={group.history} />
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
function OrderRoleNotice() {
  return (
    <section className="wrap page-state">
      <h1>Estos pedidos son para clientes</h1>
      <Link className="button" to="/catalogo">
        Explorar catálogo
      </Link>
    </section>
  );
}
