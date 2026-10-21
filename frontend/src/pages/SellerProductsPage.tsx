import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api, useSession } from '../services/session';
import {
  sellerFilters,
  sellerProductsSchema,
  productStates,
  useSellerBusiness,
} from '../services/seller';
import { money } from '../services/marketplace';
import { RemoteError } from '../components/RemoteState';
import { Pagination } from '../components/Pagination';
import { SellerNav } from '../components/SellerNav';
export function SellerProductsPage() {
  const session = useSession();
  const [params, setParams] = useSearchParams();
  let filters: ReturnType<typeof sellerFilters> | null = null;
  try {
    filters = sellerFilters(params);
  } catch {
    /* Invalid URL is presented before any product request. */
  }
  const shop = useSellerBusiness();
  const products = useQuery({
    queryKey: ['seller-products', session.user?.id, session.epoch, filters],
    enabled: !!filters && !!shop.data && session.user?.role === 'SELLER',
    queryFn: async ({ signal }) =>
      sellerProductsSchema.parse(
        (
          await api.get('/seller/products', {
            signal,
            params: {
              page: filters!.page,
              limit: 12,
              search: filters!.search || undefined,
              status: filters!.status || undefined,
            },
          })
        ).data,
      ),
  });
  return (
    <section className="wrap marketplace-page seller-page">
      <SellerNav />
      <div className="market-heading">
        <div>
          <p className="eyebrow">CADA PRODUCTO CUENTA</p>
          <h1>
            Mis <em>productos.</em>
          </h1>
        </div>
        {shop.data && ['ACTIVE', 'PENDING'].includes(shop.data.status) && (
          <Link className="button" to="/vendedor/productos/nuevo">
            Nuevo producto ↗
          </Link>
        )}
      </div>
      {!filters ? (
        <div className="remote-state">
          <h2>Revisa los filtros del enlace</h2>
          <button className="button" onClick={() => setParams({})}>
            Restablecer filtros
          </button>
        </div>
      ) : shop.isPending ? (
        <p role="status">Cargando tu tienda…</p>
      ) : shop.isError ? (
        <RemoteError error={shop.error} retry={() => void shop.refetch()} />
      ) : !shop.data ? (
        <div className="form-card">
          <h2>Primero presenta tu tienda</h2>
          <Link className="button" to="/cuenta/tienda">
            Crear mi tienda ↗
          </Link>
        </div>
      ) : (
        <>
          <ProductFilters
            key={`${filters.search}:${filters.status}`}
            search={filters.search}
            status={filters.status}
            apply={setParams}
          />
          {!['ACTIVE', 'PENDING'].includes(shop.data.status) && (
            <p className="checkout-notice">
              Tu tienda permite consultar productos. Su estado actual impide editarlos.
            </p>
          )}
          {products.isPending ? (
            <p role="status">Cargando productos…</p>
          ) : products.isError ? (
            <RemoteError error={products.error} retry={() => void products.refetch()} />
          ) : (
            <>
              <p role="status">{products.data.meta.total} productos encontrados</p>
              <div className="seller-product-list">
                {products.data.data.map((product) => (
                  <article className="seller-product-card" key={product.id}>
                    <div>
                      <h2>{product.name}</h2>
                      <p>SKU: {product.sku}</p>
                      <span className="available-badge">{productStates[product.status]}</span>
                    </div>
                    <div>
                      <strong>{money(product.price)}</strong>
                      <p>{product.stock} unidades</p>
                    </div>
                    <Link
                      className="button button-outline"
                      to={`/vendedor/productos/${product.id}/editar`}
                    >
                      {['ACTIVE', 'PENDING'].includes(shop.data!.status) ? 'Editar' : 'Consultar'}{' '}
                      {product.name} ↗
                    </Link>
                  </article>
                ))}
              </div>
              {!products.data.data.length && (
                <div className="remote-state">
                  <h2>No hay productos en esta página</h2>
                  <p>Cambia los filtros o prepara tu primer producto.</p>
                </div>
              )}
              <Pagination page={filters.page} totalPages={products.data.meta.totalPages} />
            </>
          )}
        </>
      )}
    </section>
  );
}
function ProductFilters({
  search,
  status,
  apply,
}: {
  search: string;
  status: string;
  apply: (params: URLSearchParams) => void;
}) {
  const [text, setText] = useState(search);
  const [state, setState] = useState(status);
  return (
    <form
      className="seller-filters"
      onSubmit={(event) => {
        event.preventDefault();
        const next = new URLSearchParams();
        if (text.trim()) next.set('search', text.trim());
        if (state) next.set('status', state);
        apply(next);
      }}
    >
      <label>
        Buscar nombre o SKU
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={120} />
      </label>
      <label>
        Estado
        <select value={state} onChange={(e) => setState(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(productStates).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <button className="button" type="submit">
        Aplicar filtros
      </button>
      <button
        className="button button-outline"
        type="button"
        onClick={() => {
          setText('');
          setState('');
          apply(new URLSearchParams());
        }}
      >
        Limpiar filtros
      </button>
    </form>
  );
}
