import { Link } from 'react-router-dom';
import { errorMessage, statusOf } from '../services/errors';
export function RemoteError({
  error,
  retry,
  resource = 'Este contenido',
}: {
  error: unknown;
  retry: () => void;
  resource?: string;
}) {
  return (
    <div className="remote-state">
      {statusOf(error) === 404 ? (
        <>
          <h2>{resource} no está disponible</h2>
          <p>Puede haber cambiado o ya no estar publicado.</p>
          <Link className="button" to="/catalogo">
            Explorar catálogo
          </Link>
        </>
      ) : (
        <>
          <p role="alert">{errorMessage(error)}</p>
          <button className="button" onClick={retry}>
            Reintentar
          </button>
        </>
      )}
    </div>
  );
}
