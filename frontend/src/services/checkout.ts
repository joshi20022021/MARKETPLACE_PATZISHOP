import axios from 'axios';
import { z } from 'zod';
import { cartSchema } from './cart';
import { errorMessage } from './errors';
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `Escribe al menos ${min} caracteres.`)
    .max(max, `Usa hasta ${max} caracteres.`)
    .regex(/^\P{Cc}*$/u, 'Revisa los caracteres del campo.');
export const deliverySchema = z.object({
  recipientName: text(2, 120),
  phone: z
    .string()
    .trim()
    .min(7, 'Escribe un teléfono de contacto.')
    .max(30)
    .regex(/^\+?[0-9][0-9 ()-]*$/u, 'Escribe un teléfono válido.'),
  addressLine: text(5, 500),
  city: text(2, 100),
  region: text(2, 100),
  postalCode: z
    .string()
    .trim()
    .max(20)
    .regex(/^[a-z0-9 -]*$/iu, 'Revisa el código postal.'),
  countryCode: z.literal('GT'),
  deliveryInstructions: z
    .string()
    .trim()
    .max(1000, 'Usa hasta 1000 caracteres.')
    .regex(/^[\P{Cc}\t\r\n]*$/u),
});
const methodSchema = z.enum(['CASH_ON_DELIVERY', 'SIMULATED']);
export const checkoutInputSchema = z.object({
  delivery: deliverySchema,
  paymentMethod: methodSchema,
});
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;
const paymentOptionSchema = z.object({
  method: methodSchema,
  label: z.string(),
  description: z.string(),
  simulation: z.boolean(),
});
export const checkoutOptionsSchema = z.object({
  paymentMethods: z.array(paymentOptionSchema).min(1),
  countryCode: z.literal('GT'),
  currency: z.literal('GTQ'),
  canPlaceOrder: z.literal(true),
});
export const checkoutPreviewSchema = z
  .object({
    stage: z.literal('REVIEW_ONLY'),
    canPlaceOrder: z.literal(true),
    reviewVersion: z.string().regex(/^[a-f0-9]{64}$/u),
    delivery: deliverySchema,
    cart: cartSchema,
    payment: paymentOptionSchema.extend({
      status: z.literal('PENDING'),
      currency: z.literal('GTQ'),
      amount: z.string().regex(/^\d+\.\d{2}$/u),
      requiresOnlinePayment: z.literal(false),
    }),
    shippingTotal: z.null(),
  })
  .refine(
    (value) =>
      value.cart.itemCount > 0 &&
      !value.cart.hasIssues &&
      value.payment.amount === value.cart.total,
    'Resumen de checkout inconsistente.',
  );
export type CheckoutPreview = z.infer<typeof checkoutPreviewSchema>;
export function checkoutError(error: unknown): string {
  const code: unknown = axios.isAxiosError(error) ? error.response?.data?.error : undefined;
  if (code === 'EMPTY_CART')
    return 'Tu carrito está vacío. Agrega productos antes de revisar la entrega.';
  if (code === 'CART_NEEDS_ATTENTION')
    return 'La disponibilidad cambió. Revisa las cantidades de tu carrito.';
  if (code === 'INVALID_PAYMENT_METHOD')
    return 'Selecciona uno de los métodos de pago disponibles.';
  return errorMessage(error);
}
