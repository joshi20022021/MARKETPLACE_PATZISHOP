import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
export function RouteNotice() {
  const { pathname } = useLocation();
  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'Nuestro comercio, más cerca',
      '/ingresar': 'Ingresar',
      '/registro': 'Crear cuenta',
      '/cuenta': 'Mi cuenta',
      '/cuenta/tienda': 'Mi tienda',
    };
    document.title = `${titles[pathname] ?? 'Página no encontrada'} · PatziShop`;
    document.getElementById('contenido')?.focus({ preventScroll: true });
    window.scrollTo?.(0, 0);
  }, [pathname]);
  return null;
}
