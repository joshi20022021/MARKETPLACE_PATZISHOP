import { NavLink } from 'react-router-dom';
export function AdminNav() {
  return (
    <nav className="seller-nav" aria-label="Panel administrador">
      <NavLink to="/admin/dashboard">Resumen global</NavLink>
      <NavLink to="/admin/negocios">Revisión de tiendas</NavLink>
    </nav>
  );
}
