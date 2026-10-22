import { NavLink } from 'react-router-dom';
export function SellerNav() {
  return (
    <nav className="seller-nav" aria-label="Panel del vendedor">
      <NavLink to="/vendedor" end>
        Resumen
      </NavLink>
      <NavLink to="/vendedor/productos">Mis productos</NavLink>
      <NavLink to="/vendedor/pedidos">Pedidos</NavLink>
      <NavLink to="/cuenta/tienda">Datos de mi tienda</NavLink>
    </nav>
  );
}
