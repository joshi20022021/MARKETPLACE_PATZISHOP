import { Link } from 'react-router-dom';
export function NotFoundPage() {
  return (
    <section className="page-message wrap">
      <p className="eyebrow">404 · PÁGINA NO ENCONTRADA</p>
      <h1>Este camino no está aquí.</h1>
      <p>La dirección puede haber cambiado. Vuelve al inicio para continuar.</p>
      <Link to="/" className="button">
        Volver al inicio
      </Link>
    </section>
  );
}
