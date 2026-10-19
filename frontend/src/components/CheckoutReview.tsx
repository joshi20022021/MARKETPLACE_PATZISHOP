import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import type { CheckoutPreview } from '../services/checkout';
import { money } from '../services/marketplace';
export function CheckoutReview({ value }: { value: CheckoutPreview }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <section className="checkout-review" aria-label="Revisión de entrega">
      <p className="eyebrow">TUS DATOS, A LA VISTA</p>
      <h2 ref={heading} tabIndex={-1}>
        Revisión de entrega
      </h2>
      <p role="status" className="checkout-notice">
        Datos revisados. Todavía no se ha creado un pedido ni se ha realizado un cobro.
      </p>
      <div className="checkout-review-grid">
        <div>
          <h3>Recibe</h3>
          <p>
            {value.delivery.recipientName}
            <br />
            {value.delivery.phone}
          </p>
          <h3>Dirección</h3>
          <p className="preserve-text">
            {value.delivery.addressLine}
            <br />
            {value.delivery.city}, {value.delivery.region}
            <br />
            Guatemala {value.delivery.postalCode}
          </p>
          {value.delivery.deliveryInstructions && (
            <>
              <h3>Indicaciones</h3>
              <p className="preserve-text">{value.delivery.deliveryInstructions}</p>
            </>
          )}
          <h3>{value.payment.label}</h3>
          <p>{value.payment.description}</p>
          <p>No se ha registrado un pago.</p>
        </div>
        <div>
          <h3>Productos por tienda</h3>
          {value.cart.groups.map((group) => (
            <section className="checkout-store" key={group.business?.id ?? 'unavailable'}>
              <h4>{group.business?.name}</h4>
              <ul>
                {group.items.map((item) => (
                  <li key={item.id}>
                    <span>
                      {item.quantity} × {item.product?.name}
                    </span>
                    <strong>{money(item.lineTotal ?? '0.00')}</strong>
                  </li>
                ))}
              </ul>
              <p>Subtotal: {money(group.subtotal)}</p>
            </section>
          ))}
          <p className="checkout-review-total">
            Total de productos <strong>{money(value.payment.amount)}</strong>
          </p>
          <p>Envío pendiente de cotización; no está incluido.</p>
        </div>
      </div>
      <p className="muted">
        Esta revisión no reserva inventario ni confirma una compra. La confirmación de pedidos
        estará disponible próximamente.
      </p>
      <Link className="text-link" to="/carrito">
        Volver a mi carrito ↗
      </Link>
    </section>
  );
}
