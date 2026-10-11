import { describe, expect, it } from 'vitest';
import { businessInputSchema, registerSchema } from '../src/services/contracts';
import { apiBaseUrl } from '../src/services/session';
const account = {
  name: ' María ',
  email: ' MARIA@example.test ',
  password: 'una-clave-muy-larga',
  confirmPassword: 'una-clave-muy-larga',
  role: 'SELLER',
};
describe('Contratos del cliente', () => {
  it('normaliza el correo y admite solo los roles de registro público', () => {
    expect(registerSchema.parse(account).email).toBe('maria@example.test');
    expect(registerSchema.safeParse({ ...account, role: 'ADMIN' }).success).toBe(false);
  });
  it('rechaza contraseñas cortas, distintas y con más de 72 bytes UTF-8', () => {
    expect(registerSchema.safeParse({ ...account, password: 'corta' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...account, confirmPassword: 'diferente' }).success).toBe(
      false,
    );
    expect(
      registerSchema.safeParse({
        ...account,
        password: '🔒'.repeat(19),
        confirmPassword: '🔒'.repeat(19),
      }).success,
    ).toBe(false);
  });
  it('valida los datos de tienda y rechaza URLs con credenciales', () => {
    const shop = {
      name: 'Tejidos Patzi',
      slug: 'tejidos-patzi',
      description: '',
      email: 'tienda@example.test',
      phone: '+502 5555-0000',
      address: 'Zona 1, Patzicía',
      logo: '',
      banner: '',
    };
    expect(businessInputSchema.safeParse(shop).success).toBe(true);
    expect(
      businessInputSchema.safeParse({ ...shop, logo: 'https://user:secret@example.test/logo' })
        .success,
    ).toBe(false);
    expect(businessInputSchema.safeParse({ ...shop, slug: '../otra' }).success).toBe(false);
  });
  it('limita la URL de API al prefijo esperado, sin credenciales ni query', () => {
    expect(apiBaseUrl()).toBe('/api/v1');
    expect(apiBaseUrl('https://example.test/api/v1')).toBe('https://example.test/api/v1');
    for (const url of [
      'https://user:pass@example.test/api/v1',
      'https://example.test/api/v1?token=x',
      'javascript:alert(1)',
      '//example.test/api/v1',
    ])
      expect(() => apiBaseUrl(url)).toThrow();
  });
});
