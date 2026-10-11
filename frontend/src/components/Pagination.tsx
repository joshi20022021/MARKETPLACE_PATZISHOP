import { Link, useSearchParams } from 'react-router-dom';
export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const [params] = useSearchParams();
  const href = (next: number) => {
    const values = new URLSearchParams(params);
    values.set('page', String(next));
    return `?${values}`;
  };
  if (totalPages < 2 && page === 1) return null;
  return (
    <nav className="pagination" aria-label="Paginación">
      <span aria-live="polite">
        Página {page} de {totalPages || 1}
      </span>
      <div>
        {page > 1 && (
          <Link className="button button-outline" to={href(page - 1)}>
            ← Anterior
          </Link>
        )}
        {page < totalPages && (
          <Link className="button button-outline" to={href(page + 1)}>
            Siguiente →
          </Link>
        )}
      </div>
    </nav>
  );
}
