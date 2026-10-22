import { useEffect, useId, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { api, useSession } from '../services/session';
import {
  orderStatus,
  sellerOrderSchema,
  statusNoteSchema,
  transitionError,
  type OrderPart,
  type OrderState,
} from '../services/orders';
export function OrderStatusActions({
  part,
  customer = false,
  reload,
}: {
  part: OrderPart;
  customer?: boolean;
  reload: () => Promise<unknown>;
}) {
  const session = useSession();
  const client = useQueryClient();
  const uid = useId();
  const mounted = useRef(true);
  const lock = useRef(false);
  const [target, setTarget] = useState<OrderState | ''>(customer ? 'CANCELLED' : '');
  const [note, setNote] = useState('');
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const options = customer
    ? part.allowedStatuses.filter((status) => status === 'CANCELLED')
    : part.allowedStatuses;
  if (!options.length && !blocked) return null;
  const current = () => mounted.current && useSession.getState().epoch === session.epoch;
  return (
    <div className="order-status-actions">
      <h4>{customer ? 'Cancelar este subpedido' : 'Actualizar estado'}</h4>
      <p>
        Estado actual: {orderStatus[part.status]}.{' '}
        {customer
          ? 'Puedes cancelar antes de que la tienda empiece a preparar.'
          : 'Elige únicamente el siguiente paso permitido.'}
      </p>
      {error && (
        <p className="form-alert" role="alert">
          {error}
        </p>
      )}
      {blocked ? (
        <div>
          <p>No se enviará otra operación hasta consultar el estado actual.</p>
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
                  setError('');
                  setReview(false);
                }
              } catch {
                if (current())
                  setError(
                    'No pudimos consultar el pedido. Comprueba de nuevo antes de continuar.',
                  );
              } finally {
                lock.current = false;
                if (current()) setBusy(false);
              }
            }}
          >
            Consultar estado actual
          </button>
        </div>
      ) : (
        <>
          {!review ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (busy || !target || !options.includes(target)) return;
                const parsed = statusNoteSchema.safeParse(note);
                if (!parsed.success) {
                  setError(parsed.error.issues[0]!.message);
                  return;
                }
                setNote(parsed.data);
                setError('');
                setReview(true);
              }}
            >
              <fieldset disabled={busy}>
                {!customer && (
                  <div className="field">
                    <label htmlFor={`${uid}-status`}>Nuevo estado</label>
                    <select
                      id={`${uid}-status`}
                      value={target}
                      onChange={(event) => setTarget(event.target.value as OrderState | '')}
                    >
                      <option value="">Selecciona el siguiente estado</option>
                      {options.map((value) => (
                        <option key={value} value={value}>
                          {orderStatus[value]}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="field">
                  <label htmlFor={`${uid}-note`}>
                    Nota visible al cliente y la tienda (opcional)
                  </label>
                  <textarea
                    id={`${uid}-note`}
                    rows={3}
                    maxLength={500}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </div>
                <button className="button button-outline" type="submit" disabled={!target}>
                  {customer ? 'Revisar cancelación' : 'Revisar cambio'}
                </button>
              </fieldset>
            </form>
          ) : (
            <div>
              <p className="checkout-notice">
                Vas a cambiar {orderStatus[part.status]} a{' '}
                <strong>{orderStatus[target as OrderState]}</strong>.{' '}
                {target === 'CANCELLED'
                  ? 'Se devolverán las unidades previamente descontadas de este subpedido una sola vez. No podrás reabrirlo.'
                  : 'El cambio quedará registrado en el historial.'}{' '}
                No se ejecutan cobros ni reembolsos.
              </p>
              {note && <p className="preserve-text">Nota: {note}</p>}
              <button
                className="button"
                disabled={busy}
                onClick={async () => {
                  if (lock.current || !target) return;
                  lock.current = true;
                  setBusy(true);
                  setError('');
                  let written = false;
                  try {
                    sellerOrderSchema.parse(
                      (
                        await api.patch(
                          customer
                            ? `/orders/seller-orders/${part.id}/cancel`
                            : `/seller/orders/${part.id}/status`,
                          {
                            expectedStatus: part.status,
                            ...(!customer ? { status: target } : {}),
                            note,
                          },
                        )
                      ).data,
                    );
                    written = true;
                    if (!current()) return;
                    for (const queryKey of [
                      ['order'],
                      ['orders'],
                      ['order-attempt'],
                      ['seller-order'],
                      ['seller-orders'],
                      ['seller-dashboard'],
                      ['seller-products'],
                      ['seller-product'],
                      ['cart'],
                      ['public-products'],
                      ['public-product'],
                    ])
                      void client.invalidateQueries({ queryKey, refetchType: 'none' });
                    await reload();
                    if (current()) {
                      setReview(false);
                      setNote('');
                      setTarget(customer ? 'CANCELLED' : '');
                    }
                  } catch (cause) {
                    if (!current()) return;
                    setError(
                      written
                        ? 'El cambio fue enviado, pero no pudimos consultar el resultado.'
                        : transitionError(cause),
                    );
                    if (
                      written ||
                      !isAxiosError(cause) ||
                      !cause.response ||
                      cause.response.status >= 500 ||
                      cause.response.status === 409
                    )
                      setBlocked(true);
                  } finally {
                    lock.current = false;
                    if (current()) setBusy(false);
                  }
                }}
              >
                {busy
                  ? 'Guardando estado…'
                  : target === 'CANCELLED'
                    ? 'Confirmar cancelación'
                    : 'Confirmar cambio de estado'}
              </button>
              <button
                className="button button-outline"
                disabled={busy}
                onClick={() => setReview(false)}
              >
                Volver a editar
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
