import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../src/routes/AppRoutes';
describe('rutas iniciales', () => {
  it('presenta la comunidad sin catálogo ni métricas ficticias', () => {
    render(
      <MemoryRouter>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Hecho cerca.');
    expect(screen.getByRole('link', { name: /Explorar productos/u }).getAttribute('href')).toBe(
      '/catalogo',
    );
  });
  it('una dirección desconocida ofrece un regreso al inicio', () => {
    render(
      <MemoryRouter initialEntries={['/desconocida']}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Este camino');
    expect(screen.getByRole('link', { name: 'Volver al inicio' }).getAttribute('href')).toBe('/');
  });
});
