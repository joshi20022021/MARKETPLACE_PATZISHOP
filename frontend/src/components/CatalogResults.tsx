import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  categories,
  filterParams,
  filterSchema,
  productPageSchema,
  publicApi,
  readFilters,
  type Filters,
} from '../services/marketplace';
import { FormField } from './FormField';
import { ProductCard } from './ProductCard';
import { RemoteError } from './RemoteState';
import { Pagination } from './Pagination';
export function CatalogResults({ businessSlug }: { businessSlug?: string }) {
  const [params, setParams] = useSearchParams();
  let filters: ReturnType<typeof readFilters>;
  try {
    filters = readFilters(params);
  } catch {
    return (
      <div className="remote-state">
        <h2>Revisa los filtros del enlace</h2>
        <p>La página o el rango de precios no es válido.</p>
        <button className="button" onClick={() => setParams({})}>
          Limpiar filtros
        </button>
      </div>
    );
  }
  return <CatalogQuery key={params.toString()} filters={filters} businessSlug={businessSlug} />;
}
function CatalogQuery({
  filters,
  businessSlug,
}: {
  filters: ReturnType<typeof readFilters>;
  businessSlug?: string;
}) {
  const [, setParams] = useSearchParams();
  const { page, ...values } = filters;
  const categoryQuery = useQuery({
    queryKey: ['public-categories'],
    queryFn: ({ signal }) => categories(signal),
  });
  const products = useQuery({
    queryKey: ['public-products', filters, businessSlug],
    queryFn: async ({ signal }) =>
      productPageSchema.parse(
        (
          await publicApi.get('/products', {
            params: { ...Object.fromEntries(filterParams(values)), page, limit: 12, businessSlug },
            signal,
          })
        ).data,
      ),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Filters>({ resolver: zodResolver(filterSchema), defaultValues: values });
  return (
    <div className="catalog-layout">
      <aside className="catalog-filters">
        <form noValidate onSubmit={handleSubmit((value) => setParams(filterParams(value)))}>
          <h2>Encuentra lo tuyo</h2>
          <FormField
            label="Buscar productos"
            registration={register('search')}
            error={errors.search?.message}
            type="search"
            placeholder="¿Qué estás buscando?"
            maxLength={120}
          />
          <div className="field">
            <label htmlFor="category-filter">Categoría</label>
            <select
              id="category-filter"
              {...register('categoryId')}
              disabled={categoryQuery.isPending}
              aria-invalid={Boolean(errors.categoryId)}
              aria-describedby={errors.categoryId ? 'category-error' : undefined}
            >
              <option value="">Todas las categorías</option>
              {categoryQuery.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
              {values.categoryId &&
                !categoryQuery.data?.some((category) => category.id === values.categoryId) && (
                  <option value={values.categoryId}>Categoría del enlace</option>
                )}
            </select>
            {errors.categoryId && (
              <small className="field-error" id="category-error">
                {errors.categoryId.message}
              </small>
            )}
          </div>
          {categoryQuery.isError && (
            <div className="filter-warning">
              <p>No pudimos cargar las categorías.</p>
              <button
                type="button"
                className="text-button"
                onClick={() => void categoryQuery.refetch()}
              >
                Reintentar categorías
              </button>
            </div>
          )}
          <fieldset className="price-fields">
            <legend>Precio en quetzales</legend>
            <FormField
              label="Desde"
              registration={register('minPrice')}
              error={errors.minPrice?.message}
              inputMode="decimal"
              placeholder="0.00"
            />
            <FormField
              label="Hasta"
              registration={register('maxPrice')}
              error={errors.maxPrice?.message}
              inputMode="decimal"
              placeholder="500.00"
            />
          </fieldset>
          <div className="field">
            <label htmlFor="sort-filter">Ordenar por</label>
            <select id="sort-filter" {...register('sort')}>
              <option value="newest">Más recientes</option>
              <option value="price-asc">Menor precio</option>
              <option value="price-desc">Mayor precio</option>
            </select>
          </div>
          <button className="button button-full">Aplicar filtros</button>
          <button className="text-button clear-filters" type="button" onClick={() => setParams({})}>
            Limpiar filtros
          </button>
        </form>
      </aside>
      <div className="catalog-content" aria-busy={products.isFetching}>
        {products.isPending ? (
          <p className="remote-state" role="status">
            Buscando productos de nuestra comunidad…
          </p>
        ) : products.isError ? (
          <RemoteError error={products.error} retry={() => void products.refetch()} />
        ) : (
          <>
            <div className="results-bar">
              <p role="status">
                <strong>{products.data.meta.total}</strong>{' '}
                {products.data.meta.total === 1 ? 'producto disponible' : 'productos disponibles'}
              </p>
              <span>De negocios locales</span>
            </div>
            {products.data.data.length ? (
              <div className="product-grid">
                {products.data.data.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="remote-state">
                <h2>
                  {page > 1 ? 'No hay productos en esta página' : 'Todavía no hay coincidencias'}
                </h2>
                <p>
                  {page > 1
                    ? 'Vuelve a una página anterior o ajusta los filtros.'
                    : 'Prueba otra búsqueda o vuelve pronto para descubrir nuevas propuestas.'}
                </p>
                <button className="button button-outline" onClick={() => setParams({})}>
                  Ver todos los productos
                </button>
              </div>
            )}
            <Pagination page={page} totalPages={products.data.meta.totalPages} />
          </>
        )}
      </div>
    </div>
  );
}
