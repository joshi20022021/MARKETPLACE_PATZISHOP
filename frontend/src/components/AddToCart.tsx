import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSession } from '../services/session';
import { cartError, quantitySchema, useCartActions } from '../services/cart';
export function AddToCart({ productId }: { productId: string }) {
  const session = useSession();
  const location = useLocation();
  if (session.status === 'loading') return <p role="status">Comprobando tu sesión…</p>;
  if (session.status === 'unavailable')
    return (
      <Link className="button" to="/carrito">
        Comprueba tu sesión para comprar
      </Link>
    );
  if (!session.user)
    return (
      <Link className="button" to="/ingresar" state={{ from: location.pathname }}>
        Ingresa para agregar al carrito
      </Link>
    );
  if (session.user.role !== 'CUSTOMER') return <p>Para comprar, utiliza una cuenta de cliente.</p>;
  return <AddForm key={`${productId}:${session.user.id}:${session.epoch}`} productId={productId} />;
}
function AddForm({ productId }: { productId: string }) {
  const [quantity, setQuantity] = useState('1');
  const [invalid, setInvalid] = useState('');
  const change = useCartActions();
  return (
    <form
      className="add-to-cart"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setInvalid('');
        change.reset();
        const result = quantitySchema.safeParse(Number(quantity));
        if (!result.success) {
          setInvalid('Elige entre 1 y 99 unidades enteras.');
          return;
        }
        change.mutate({ method: 'add', productId, quantity: result.data });
      }}
    >
      <label htmlFor={`quantity-${productId}`}>Cantidad</label>
      <div className="quantity-action">
        <input
          id={`quantity-${productId}`}
          type="number"
          inputMode="numeric"
          min="1"
          max="99"
          step="1"
          value={quantity}
          disabled={change.isPending}
          onChange={(event) => {
            setQuantity(event.target.value);
            setInvalid('');
            change.reset();
          }}
          aria-invalid={Boolean(invalid)}
          aria-describedby={invalid ? `quantity-error-${productId}` : undefined}
        />
        <button className="button" disabled={change.isPending}>
          {change.isPending ? 'Agregando…' : 'Agregar al carrito'}
        </button>
      </div>
      {invalid && (
        <p className="field-error" id={`quantity-error-${productId}`} role="alert">
          {invalid}
        </p>
      )}
      {change.isError && (
        <p role="alert" className="field-error">
          {cartError(change.error)}
        </p>
      )}
      {change.isSuccess && (
        <p role="status">
          Producto agregado.{' '}
          <Link className="text-link" to="/carrito">
            Ver mi carrito ↗
          </Link>
        </p>
      )}
      <small>La disponibilidad se comprueba al agregar. El carrito no reserva productos.</small>
    </form>
  );
}
