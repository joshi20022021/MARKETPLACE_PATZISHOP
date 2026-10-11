import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  mediaUrl,
  money,
  publicApi,
  publicProductSchema,
  type PublicProduct,
} from '../services/marketplace';
import { PublicImage } from '../components/PublicImage';
import { RemoteError } from '../components/RemoteState';
export function ProductPage() {
  const { slug = '' } = useParams();
  const product = useQuery({
    queryKey: ['public-product', slug],
    queryFn: async ({ signal }) =>
      publicProductSchema.parse(
        (await publicApi.get(`/products/${encodeURIComponent(slug)}`, { signal })).data,
      ),
  });
  if (product.isPending)
    return (
      <p className="wrap page-state" role="status">
        Cargando producto…
      </p>
    );
  if (product.isError)
    return (
      <div className="wrap page-state">
        <RemoteError
          resource="Este producto"
          error={product.error}
          retry={() => void product.refetch()}
        />
      </div>
    );
  return <ProductDetail key={product.data.id} product={product.data} />;
}
function ProductDetail({ product }: { product: PublicProduct }) {
  const images = [
    ...new Set(
      [product.mainImage, ...product.images.map((image) => image.url)].filter(
        (value): value is string => Boolean(value),
      ),
    ),
  ];
  const [selected, setSelected] = useState<string | null>(null);
  const current = selected && images.includes(selected) ? selected : (images[0] ?? null);
  return (
    <section className="wrap marketplace-page">
      <nav className="breadcrumbs" aria-label="Ruta del producto">
        <Link to="/catalogo">Catálogo</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/catalogo?categoryId=${product.category.id}`}>{product.category.name}</Link>
        <span aria-hidden="true">/</span>
        <span>{product.name}</span>
      </nav>
      <div className="product-detail">
        <div className="product-gallery">
          <PublicImage key={current} src={mediaUrl(current)} alt={product.name} eager />
          {images.length > 1 && (
            <div className="gallery-thumbs" role="group" aria-label="Imágenes del producto">
              {images.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  aria-label={`Ver imagen ${index + 1} de ${product.name}`}
                  aria-pressed={current === url}
                  onClick={() => setSelected(url)}
                >
                  <PublicImage src={mediaUrl(url)} alt={`Vista ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="product-detail-copy">
          <Link className="eyebrow text-link" to={`/tiendas/${product.business.slug}`}>
            {product.business.name} ↗
          </Link>
          <h1>{product.name}</h1>
          <p className="detail-price">{money(product.price)}</p>
          <span className="available-badge">Disponible</span>
          <h2>Sobre este producto</h2>
          <p className="preserve-text">{product.description}</p>
          <div className="seller-note">
            <span aria-hidden="true">✳</span>
            <div>
              <h2>Conoce a quien lo hace</h2>
              <p>Un producto de {product.business.name}, un negocio de nuestra comunidad.</p>
              <Link className="button button-outline" to={`/tiendas/${product.business.slug}`}>
                Visitar tienda ↗
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
