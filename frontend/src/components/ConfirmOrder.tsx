import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api, useSession } from '../services/session';
import {
  clearOrderKey,
  orderError,
  orderSchema,
  rememberOrderKey,
  uncertainOrder,
} from '../services/orders';
import { money } from '../services/marketplace';
import type { CheckoutPreview } from '../services/checkout';
export function ConfirmOrder({
  value,
  onLock,
  onUncertain,
  onRejected,
}: {
  value: CheckoutPreview;
  onLock: (locked: boolean) => void;
  onUncertain: (key: string) => void;
  onRejected: (message: string) => void;
}) {
  const session = useSession();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [pending, setPending] = useState(false);
  const sending = useRef(false);
  const [key] = useState(() => crypto.randomUUID());
  return (
    <div className="confirm-order">
      <p>
        Al confirmar se creará tu pedido y se descontarán las cantidades disponibles. El total
        corresponde a productos; no incluye envío.
      </p>
      {value.payment.simulation && (
        <p className="checkout-notice">
          Compra de prueba: el pago se marcará como simulado, sin cobrar dinero real.
        </p>
      )}
      <button
        type="button"
        className="button"
        disabled={pending}
        onClick={async () => {
          if (sending.current || !session.user) return;
          sending.current = true;
          setPending(true);
          onLock(true);
          rememberOrderKey(session.user.id, key);
          try {
            const order = orderSchema.parse(
              (
                await api.post('/orders', {
                  delivery: value.delivery,
                  paymentMethod: value.payment.method,
                  reviewVersion: value.reviewVersion,
                  idempotencyKey: key,
                })
              ).data,
            );
            if (useSession.getState().epoch !== session.epoch) return;
            clearOrderKey(session.user.id);
            navigate(`/pedidos/${order.id}`, { replace: true });
            for (const queryKey of [['cart'], ['orders'], ['public-products'], ['public-product']])
              void client.invalidateQueries({ queryKey });
          } catch (error) {
            if (useSession.getState().epoch !== session.epoch) return;
            if (uncertainOrder(error)) onUncertain(key);
            else {
              clearOrderKey(session.user.id);
              onLock(false);
              onRejected(orderError(error));
              void client.invalidateQueries({ queryKey: ['cart', session.user.id, session.epoch] });
            }
          } finally {
            sending.current = false;
            setPending(false);
          }
        }}
      >
        {pending ? 'Confirmando pedido…' : `Confirmar pedido · ${money(value.payment.amount)}`}
      </button>
    </div>
  );
}
