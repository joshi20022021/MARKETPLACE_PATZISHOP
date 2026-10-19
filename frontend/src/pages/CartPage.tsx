import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../services/session';
import {
  cartError,
  quantitySchema,
  useCart,
  useCartActions,
  type CartItem,
} from '../services/cart';
import { mediaUrl, money } from '../services/marketplace';
import { PublicImage } from '../components/PublicImage';
export function CartPage() {
  const session = useSession();
  return <CustomerCart key={`${session.user?.id}:${session.epoch}`} />;
}
function CustomerCart() {
  const user = useSession((state) => state.user);
  const cart = useCart();
  const change = useCartActions();
  if (user?.role !== 'CUSTOMER')
    return (
      <section className="wrap page-state">
        <h1>El carrito es para clientes</h1>
        <p>Tu cuenta actual no tiene acceso a compras.</p>
        <Link className="button" to="/catalogo">
          Explorar catálogo
        </Link>
      </section>
    );
  if (cart.isPending)
    return (
      <p className="wrap page-state" role="status">
        Cargando tu carrito…
      </p>
    );
  if (cart.isError)
    return (
      <div className="wrap page-state">
        <h1>No pudimos cargar tu carrito</h1>
        <p role="alert">{cartError(cart.error)}</p>
        <button className="button" onClick={() => void cart.refetch()}>
          Reintentar
        </button>
      </div>
    );
  const value = cart.data;
  return (
    <section className="wrap marketplace-page cart-page">
      <Link className="back-link" to="/catalogo">
        ← Seguir explorando
      </Link>
      <div className="market-heading">
        <div>
          <p className="eyebrow">DE TUS VECINOS, PARA TI</p>
          <h1>
            Mi <em>carrito.</em>
          </h1>
          <p>
            {value.quantityCount} {value.quantityCount === 1 ? 'unidad' : 'unidades'} de nuestros
            negocios locales.
          </p>
        </div>
        <button
          className="button button-outline"
          disabled={cart.isFetching || change.isPending}
          onClick={() => {
            change.reset();
            void cart.refetch();
          }}
        >
          {cart.isFetching ? 'Actualizando…' : 'Actualizar carrito'}
        </button>
      </div>
      {change.isError && (
        <p role="alert" className="form-alert">
          {cartError(change.error)}
        </p>
      )}
      {change.isSuccess && (
        <p role="status" className="cart-notice">
          Carrito actualizado.
        </p>
      )}
      {!value.itemCount ? (
        <div className="remote-state">
          <h2>Tu carrito está esperando algo especial</h2>
          <p>Descubre productos de nuestra comunidad y agrega tus favoritos.</p>
          <Link className="button" to="/catalogo">
            Explorar productos
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-groups" aria-busy={change.isPending || cart.isFetching}>
            {value.groups.map((group) => (
              <section className="cart-group" key={group.business?.id ?? 'unavailable'}>
                <div className="cart-group-heading">
                  <h2>
                    {group.business ? (
                      <Link to={`/tiendas/${group.business.slug}`}>{group.business.name} ↗</Link>
                    ) : (
                      'Productos no disponibles'
                    )}
                  </h2>
                  <span>Subtotal: {money(group.subtotal)}</span>
                </div>
                {group.items.map((item) => (
                  <CartLine
                    key={`${item.id}:${item.quantity}:${item.maxQuantity}`}
                    item={item}
                    busy={change.isPending || cart.isFetching}
                    update={(quantity) =>
                      change.mutate({ method: 'update', id: item.id, quantity })
                    }
                    remove={() => change.mutate({ method: 'remove', id: item.id })}
                  />
                ))}
              </section>
            ))}
          </div>
          <aside className="cart-summary">
            <h2>Tu resumen</h2>
            <dl>
              <div>
                <dt>Subtotal disponible</dt>
                <dd>{money(value.subtotal)}</dd>
              </div>
              <div className="cart-total">
                <dt>Total de productos</dt>
                <dd>{money(value.total)}</dd>
              </div>
            </dl>
            {value.hasIssues && (
              <p className="field-error" role="alert">
                Hay productos que necesitan tu atención. Ajusta sus cantidades o quítalos; no se
                incluyen en el total.
              </p>
            )}
            <p>El carrito no reserva productos. Precios y disponibilidad pueden cambiar.</p>
            <p className="muted">
              Este total corresponde a productos disponibles; no incluye envío.
            </p>
            <Link className="text-link" to="/catalogo">
              Descubrir más productos ↗
            </Link>
            {!value.hasIssues && !change.isPending && !cart.isFetching && (
              <Link className="button button-full checkout-link" to="/checkout">
                Preparar entrega ↗
              </Link>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
function CartLine({
  item,
  busy,
  update,
  remove,
}: {
  item: CartItem;
  busy: boolean;
  update: (quantity: number) => void;
  remove: () => void;
}) {
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [error, setError] = useState('');
  const name = item.product?.name ?? 'Producto no disponible';
  return (
    <article className="cart-line">
      <PublicImage src={mediaUrl(item.product?.mainImage ?? null)} alt={name} />
      <div className="cart-line-copy">
        <h3>{item.product ? <Link to={`/productos/${item.product.slug}`}>{name}</Link> : name}</h3>
        {item.product && <p>{money(item.product.price)} por unidad</p>}
        {item.issue && (
          <p className="field-error">
            {item.issue === 'UNAVAILABLE'
              ? 'Ya no está publicado o disponible. Puedes quitarlo.'
              : `Ahora puedes elegir hasta ${item.maxQuantity} ${item.maxQuantity === 1 ? 'unidad' : 'unidades'}.`}
          </p>
        )}
        <form
          noValidate
          className="cart-quantity-form"
          onSubmit={(event) => {
            event.preventDefault();
            const result = quantitySchema.safeParse(Number(quantity));
            if (!result.success || result.data > item.maxQuantity) {
              setError(`Elige entre 1 y ${item.maxQuantity} unidades enteras.`);
              return;
            }
            setError('');
            update(result.data);
          }}
        >
          <label htmlFor={`cart-quantity-${item.id}`}>Cantidad de {name}</label>
          <div className="quantity-action">
            <input
              id={`cart-quantity-${item.id}`}
              type="number"
              inputMode="numeric"
              min="1"
              max={item.maxQuantity}
              step="1"
              value={quantity}
              disabled={busy || !item.product}
              onChange={(event) => setQuantity(event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `cart-error-${item.id}` : undefined}
            />
            <button className="button button-outline button-small" disabled={busy || !item.product}>
              Guardar cantidad
            </button>
          </div>
          {error && (
            <p id={`cart-error-${item.id}`} className="field-error" role="alert">
              {error}
            </p>
          )}
        </form>
        <button type="button" className="text-button cart-remove" disabled={busy} onClick={remove}>
          Quitar {name}
        </button>
      </div>
      <strong className="cart-line-total">
        {item.lineTotal ? money(item.lineTotal) : 'Sin subtotal'}
      </strong>
    </article>
  );
}
