import * as ui from '../components/ui';
import { Link } from 'react-router-dom';
export function NotFoundPage() {
  return (
    <section className={`${ui.pageMessage} ${ui.wrap}`}>
      <p className={ui.eyebrow}>404 · PÁGINA NO ENCONTRADA</p>
      <h1>Este camino no está aquí.</h1>
      <p>La dirección puede haber cambiado. Vuelve al inicio para continuar.</p>
      <Link to="/" className={ui.button}>
        Volver al inicio
      </Link>
    </section>
  );
}
