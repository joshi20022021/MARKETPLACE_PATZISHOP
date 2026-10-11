import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { businessPageSchema, publicApi, safeImageUrl } from '../services/marketplace';
import { PublicImage } from '../components/PublicImage';
import { RemoteError } from '../components/RemoteState';
import { Pagination } from '../components/Pagination';
export function StoresPage() {
  const [params, setParams] = useSearchParams();
  const search = (params.get('search') ?? '').trim();
  const rawPage = params.get('page') ?? '1';
  const page = Number(rawPage);
  const valid =
    /^\d+$/u.test(rawPage) &&
    page >= 1 &&
    page <= 10000 &&
    search.length <= 120 &&
    ['page', 'search'].every((key) => params.getAll(key).length <= 1);
  const stores = useQuery({
    queryKey: ['public-stores', search, page],
    enabled: valid,
    queryFn: async ({ signal }) =>
      businessPageSchema.parse(
        (
          await publicApi.get('/businesses', {
            params: { search: search || undefined, page, limit: 12 },
            signal,
          })
        ).data,
      ),
  });
  return (
    <section className="wrap marketplace-page">
      <div className="market-heading">
        <div>
          <p className="eyebrow">PERSONAS REALES, NEGOCIOS DE AQUÍ</p>
          <h1>
            Conoce a<br />
            <em>tus vecinos.</em>
          </h1>
          <p>Cada tienda tiene una historia. Descubre la suya.</p>
        </div>
        <Link className="text-link" to="/catalogo">
          Explorar productos ↗
        </Link>
      </div>
      <form
        className="store-search"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setParams({ search: String(data.get('search') ?? '').trim() });
        }}
      >
        <label htmlFor="store-search">Buscar tiendas</label>
        <div>
          <input
            key={search}
            id="store-search"
            name="search"
            type="search"
            maxLength={120}
            defaultValue={search}
            placeholder="Nombre o descripción del negocio"
          />
          <button className="button">Buscar</button>
        </div>
      </form>
      {!valid ? (
        <div className="remote-state">
          <h2>El enlace contiene filtros inválidos</h2>
          <button className="button" onClick={() => setParams({})}>
            Limpiar búsqueda
          </button>
        </div>
      ) : stores.isPending ? (
        <p className="remote-state" role="status">
          Buscando tiendas…
        </p>
      ) : stores.isError ? (
        <RemoteError error={stores.error} retry={() => void stores.refetch()} />
      ) : (
        <>
          <p className="results-bar" role="status">
            {stores.data.meta.total} {stores.data.meta.total === 1 ? 'tienda' : 'tiendas'} en
            nuestra comunidad
          </p>
          {stores.data.data.length ? (
            <div className="store-grid">
              {stores.data.data.map((store) => (
                <article className="store-card" key={store.id}>
                  <Link to={`/tiendas/${store.slug}`}>
                    <PublicImage key={store.logo} src={safeImageUrl(store.logo)} alt={store.name} />
                    <div className="store-card-copy">
                      <h2>{store.name}</h2>
                      <p>{store.description || 'Conoce los productos de este negocio local.'}</p>
                      <span>Visitar tienda ↗</span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="remote-state">
              <h2>No encontramos tiendas aquí</h2>
              <p>Prueba otra búsqueda o vuelve a la primera página.</p>
              <button className="button button-outline" onClick={() => setParams({})}>
                Ver todas las tiendas
              </button>
            </div>
          )}
          <Pagination page={page} totalPages={stores.data.meta.totalPages} />
        </>
      )}
    </section>
  );
}
