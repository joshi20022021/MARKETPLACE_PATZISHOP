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
      '/catalogo': 'Catálogo',
      '/tiendas': 'Tiendas locales',
      '/carrito': 'Mi carrito',
      '/checkout': 'Preparar entrega',
      '/pedidos': 'Mis pedidos',
      '/vendedor': 'Mi panel',
      '/vendedor/productos': 'Mis productos',
      '/vendedor/productos/nuevo': 'Nuevo producto',
      '/vendedor/pedidos': 'Pedidos de mi tienda',
    };
    document.title = `${titles[pathname] ?? (pathname.startsWith('/vendedor/pedidos/') ? 'Subpedido de mi tienda' : pathname.startsWith('/vendedor/productos/') ? 'Editar producto' : pathname.startsWith('/pedidos/') ? 'Mi pedido' : pathname.startsWith('/productos/') ? 'Producto local' : pathname.startsWith('/tiendas/') ? 'Tienda local' : 'Página no encontrada')} · PatziShop`;
    document.getElementById('contenido')?.focus({ preventScroll: true });
    window.scrollTo?.(0, 0);
  }, [pathname]);
  return null;
}
