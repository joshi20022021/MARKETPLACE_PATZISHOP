import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { publicApi, publicBusinessSchema, safeImageUrl } from '../services/marketplace';
import { CatalogResults } from '../components/CatalogResults';
import { PublicImage } from '../components/PublicImage';
import { RemoteError } from '../components/RemoteState';
export function PublicShopPage() {
  const { slug = '' } = useParams();
  const store = useQuery({
    queryKey: ['public-store', slug],
    queryFn: async ({ signal }) =>
      publicBusinessSchema.parse(
        (await publicApi.get(`/businesses/${encodeURIComponent(slug)}`, { signal })).data,
      ),
  });
  if (store.isPending)
    return (
      <p className="wrap page-state" role="status">
        Cargando tienda…
      </p>
    );
  if (store.isError)
    return (
      <div className="wrap page-state">
        <RemoteError
          resource="Esta tienda"
          error={store.error}
          retry={() => void store.refetch()}
        />
      </div>
    );
  const value = store.data;
  return (
    <section className="wrap marketplace-page">
      <Link className="back-link" to="/tiendas">
        ← Todas las tiendas
      </Link>
      {safeImageUrl(value.banner) && (
        <PublicImage
          key={value.banner}
          src={safeImageUrl(value.banner)}
          alt={`Portada de ${value.name}`}
          className="store-banner"
          eager
        />
      )}
      <div className="shop-intro">
        <PublicImage
          key={value.logo}
          src={safeImageUrl(value.logo)}
          alt={`Logo de ${value.name}`}
          className="shop-logo"
          eager
        />
        <div>
          <p className="eyebrow">UN NEGOCIO DE NUESTRA COMUNIDAD</p>
          <h1>{value.name}</h1>
          <p className="preserve-text">
            {value.description || 'Descubre los productos de nuestra tienda.'}
          </p>
        </div>
      </div>
      <div className="shop-contact">
        <span>⌁ {value.address}</span>
        <a href={`mailto:${value.email}`}>{value.email}</a>
        <a href={`tel:${value.phone.replace(/[^+0-9]/gu, '')}`}>{value.phone}</a>
      </div>
      <h2 className="section-title">Los productos de esta tienda</h2>
      <CatalogResults businessSlug={value.slug} />
    </section>
  );
}
