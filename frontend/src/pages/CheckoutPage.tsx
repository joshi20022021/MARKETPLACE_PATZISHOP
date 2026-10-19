import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, useSession } from '../services/session';
import { useCart } from '../services/cart';
import {
  checkoutError,
  checkoutInputSchema,
  checkoutOptionsSchema,
  checkoutPreviewSchema,
  type CheckoutInput,
  type CheckoutPreview,
} from '../services/checkout';
import { money } from '../services/marketplace';
import { statusOf } from '../services/errors';
import { FormField } from '../components/FormField';
import { CheckoutReview } from '../components/CheckoutReview';
import { OrderRecovery } from '../components/OrderRecovery';
import { pendingOrderKey } from '../services/orders';
export function CheckoutPage() {
  const session = useSession();
  if (session.user?.role !== 'CUSTOMER')
    return (
      <section className="wrap page-state">
        <h1>El checkout es para clientes</h1>
        <p>Tu cuenta actual no tiene acceso a compras.</p>
        <Link className="button" to="/catalogo">
          Explorar catálogo
        </Link>
      </section>
    );
  return <CustomerCheckout key={`${session.user.id}:${session.epoch}`} userId={session.user.id} />;
}
function CustomerCheckout({ userId }: { userId: string }) {
  const [attempt, setAttempt] = useState(() => pendingOrderKey(userId));
  return attempt ? (
    <OrderRecovery attempt={attempt} onMissing={() => setAttempt(null)} />
  ) : (
    <CheckoutForm onUncertain={setAttempt} />
  );
}
function CheckoutForm({ onUncertain }: { onUncertain: (key: string) => void }) {
  const session = useSession();
  const client = useQueryClient();
  const cart = useCart();
  const options = useQuery({
    queryKey: ['checkout-options', session.user?.id, session.epoch],
    queryFn: async ({ signal }) =>
      checkoutOptionsSchema.parse((await api.get('/checkout/options', { signal })).data),
  });
  const request = useRef<AbortController | null>(null);
  const revision = useRef(0);
  const [review, setReview] = useState<{ value: CheckoutPreview; signature: string } | null>(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  useEffect(() => () => request.current?.abort(), []);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutInputSchema),
    defaultValues: {
      delivery: {
        recipientName: session.user?.name ?? '',
        phone: '',
        addressLine: '',
        city: '',
        region: '',
        postalCode: '',
        countryCode: 'GT',
        deliveryInstructions: '',
      },
      paymentMethod: 'CASH_ON_DELIVERY',
    },
  });
  if (cart.isPending || options.isPending)
    return (
      <p className="wrap page-state" role="status">
        Preparando tu entrega…
      </p>
    );
  if (cart.isError || options.isError)
    return (
      <section className="wrap page-state">
        <h1>No pudimos preparar tu entrega</h1>
        <p role="alert">{checkoutError(cart.error ?? options.error)}</p>
        <button
          className="button"
          onClick={() => {
            void cart.refetch();
            void options.refetch();
          }}
        >
          Reintentar
        </button>
      </section>
    );
  if (!cart.data.itemCount || cart.data.hasIssues)
    return (
      <section className="wrap page-state">
        <h1>{cart.data.hasIssues ? 'Tu carrito necesita atención' : 'Tu carrito está vacío'}</h1>
        <p>
          {cart.data.hasIssues
            ? 'Ajusta o quita los productos que ya no están disponibles antes de revisar tu entrega.'
            : 'Agrega productos de nuestra comunidad para continuar.'}
        </p>
        <Link className="button" to={cart.data.hasIssues ? '/carrito' : '/catalogo'}>
          {cart.data.hasIssues ? 'Revisar mi carrito' : 'Explorar productos'}
        </Link>
      </section>
    );
  const value = cart.data;
  const summary =
    review && review.signature === JSON.stringify(value) && !cart.isFetching ? review.value : null;
  return (
    <section className="wrap marketplace-page checkout-page">
      <Link className="back-link" to="/carrito">
        ← Mi carrito
      </Link>
      <div className="market-heading">
        <div>
          <p className="eyebrow">UN PASO MÁS CERCA</p>
          <h1>
            Prepara tu <em>entrega.</em>
          </h1>
          <p>Revisa tus datos y elige cómo prefieres pagar.</p>
        </div>
      </div>
      <p className="checkout-notice">
        Revisa la entrega antes de confirmar. El importe mostrado corresponde a productos y no
        incluye envío.
      </p>
      <div className="checkout-layout">
        <form
          className="form-card checkout-form"
          noValidate
          onChange={() => {
            revision.current += 1;
            setReview(null);
            setError('');
          }}
          onSubmit={handleSubmit(async (input) => {
            setReview(null);
            setError('');
            request.current?.abort();
            const controller = new AbortController();
            request.current = controller;
            const submittedRevision = revision.current;
            try {
              const result = checkoutPreviewSchema.parse(
                (await api.post('/checkout/preview', input, { signal: controller.signal })).data,
              );
              if (
                controller.signal.aborted ||
                useSession.getState().epoch !== session.epoch ||
                submittedRevision !== revision.current
              )
                return;
              client.setQueryData(['cart', session.user?.id, session.epoch], result.cart);
              setReview({ value: result, signature: JSON.stringify(result.cart) });
            } catch (cause) {
              if (controller.signal.aborted || useSession.getState().epoch !== session.epoch)
                return;
              setError(checkoutError(cause));
              if (statusOf(cause) === 409)
                void client.invalidateQueries({
                  queryKey: ['cart', session.user?.id, session.epoch],
                });
            }
          })}
        >
          <fieldset disabled={isSubmitting || confirming}>
            <legend>1. Datos de entrega</legend>
            <FormField
              label="Nombre de quien recibe"
              registration={register('delivery.recipientName')}
              error={errors.delivery?.recipientName?.message}
              autoComplete="shipping name"
              maxLength={120}
              required
            />
            <FormField
              label="Teléfono de contacto"
              registration={register('delivery.phone')}
              error={errors.delivery?.phone?.message}
              type="tel"
              autoComplete="shipping tel"
              maxLength={30}
              required
            />
            <FormField
              label="Dirección de entrega"
              registration={register('delivery.addressLine')}
              error={errors.delivery?.addressLine?.message}
              autoComplete="shipping street-address"
              maxLength={500}
              required
            />
            <div className="checkout-fields">
              <FormField
                label="Municipio o ciudad"
                registration={register('delivery.city')}
                error={errors.delivery?.city?.message}
                autoComplete="shipping address-level2"
                maxLength={100}
                required
              />
              <FormField
                label="Departamento"
                registration={register('delivery.region')}
                error={errors.delivery?.region?.message}
                autoComplete="shipping address-level1"
                maxLength={100}
                required
              />
            </div>
            <FormField
              label="Código postal (opcional)"
              registration={register('delivery.postalCode')}
              error={errors.delivery?.postalCode?.message}
              autoComplete="shipping postal-code"
              maxLength={20}
            />
            <p className="checkout-country">País: Guatemala</p>
            <div className="field">
              <label htmlFor="delivery-instructions">Indicaciones de entrega (opcional)</label>
              <textarea
                id="delivery-instructions"
                {...register('delivery.deliveryInstructions')}
                maxLength={1000}
                rows={3}
                aria-invalid={Boolean(errors.delivery?.deliveryInstructions)}
                aria-describedby={
                  errors.delivery?.deliveryInstructions ? 'instructions-error' : undefined
                }
              />
              {errors.delivery?.deliveryInstructions && (
                <small className="field-error" id="instructions-error">
                  {errors.delivery.deliveryInstructions.message}
                </small>
              )}
            </div>
          </fieldset>
          <fieldset className="payment-options" disabled={isSubmitting || confirming}>
            <legend>2. Forma de pago</legend>
            {options.data.paymentMethods.map((option) => (
              <label className="payment-option" key={option.method}>
                <input type="radio" value={option.method} {...register('paymentMethod')} />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
              </label>
            ))}
            {errors.paymentMethod && <p className="field-error">Selecciona un método válido.</p>}
          </fieldset>
          {error && (
            <p className="form-alert" role="alert">
              {error}
            </p>
          )}
          <button
            className="button button-full"
            disabled={isSubmitting || cart.isFetching || confirming}
          >
            {isSubmitting ? 'Revisando…' : 'Revisar entrega'}
          </button>
          <p className="checkout-privacy">
            Al confirmar se guardará una copia de la entrega en tu pedido. Si sales antes, los datos
            del formulario se descartan.
          </p>
        </form>
        <aside className="cart-summary checkout-summary">
          <h2>Tu carrito</h2>
          {value.groups.map((group) => (
            <div className="checkout-store" key={group.business?.id ?? 'unavailable'}>
              <h3>{group.business?.name}</h3>
              {group.items.map((item) => (
                <p className="checkout-summary-item" key={item.id}>
                  <span>
                    {item.quantity} × {item.product?.name}
                  </span>
                  <strong>{money(item.lineTotal ?? '0.00')}</strong>
                </p>
              ))}
            </div>
          ))}
          <dl>
            <div>
              <dt>Total de productos</dt>
              <dd>{money(value.total)}</dd>
            </div>
          </dl>
          <p>Envío pendiente de cotización. Precios y disponibilidad se comprueban al revisar.</p>
          <Link className="text-link" to="/carrito">
            Editar carrito ↗
          </Link>
        </aside>
      </div>
      {summary && (
        <CheckoutReview
          value={summary}
          onLock={setConfirming}
          onUncertain={onUncertain}
          onRejected={(message) => {
            setReview(null);
            setError(message);
          }}
        />
      )}
    </section>
  );
}
