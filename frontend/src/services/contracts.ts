import { z } from 'zod';

export const userSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  role: z.enum(['CUSTOMER', 'SELLER', 'ADMIN']),
});
export type User = z.infer<typeof userSchema>;
export const grantSchema = z.object({
  success: z.literal(true),
  accessToken: z.string().min(1),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().int().positive(),
  user: userSchema,
});
export const businessSchema = z.object({
  id: z.uuid(),
  ownerId: z.uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  email: z.string(),
  phone: z.string(),
  address: z.string(),
  logo: z.string().nullable(),
  banner: z.string().nullable(),
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED']),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Business = z.infer<typeof businessSchema>;
const email = z.string().trim().toLowerCase().pipe(z.email('Escribe un correo válido.').max(254));
const password = z
  .string()
  .min(1, 'Escribe tu contraseña.')
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    'Usa una contraseña de hasta 72 bytes.',
  );
export const loginSchema = z.object({ email, password });
export const registerSchema = loginSchema
  .extend({
    name: z.string().trim().min(2, 'Escribe tu nombre.').max(120),
    password: password.refine(
      (value) => Array.from(value).length >= 12,
      'Usa al menos 12 caracteres.',
    ),
    role: z.enum(['CUSTOMER', 'SELLER']),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Las contraseñas deben coincidir.',
    path: ['confirmPassword'],
  });
const imageUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
    } catch {
      return false;
    }
  }, 'Usa una URL HTTP(S) sin credenciales.');
export const businessInputSchema = z.object({
  name: z.string().trim().min(2, 'Escribe el nombre de la tienda.').max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, 'Usa letras minúsculas, números y guiones.'),
  description: z.string().trim().max(3000),
  email,
  phone: z
    .string()
    .trim()
    .min(7)
    .max(30)
    .regex(/^\+?[0-9][0-9 ()-]*$/u, 'Escribe un teléfono válido.'),
  address: z.string().trim().min(5, 'Escribe una dirección completa.').max(500),
  logo: imageUrl,
  banner: imageUrl,
});
export type BusinessInput = z.infer<typeof businessInputSchema>;
