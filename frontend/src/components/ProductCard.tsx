import { Link } from 'react-router-dom';
import { mediaUrl, money, type PublicProduct } from '../services/marketplace';
import { PublicImage } from './PublicImage';
export function ProductCard({ product }: { product: PublicProduct }) {
  return (
    <article className="product-card">
      <Link
        to={`/productos/${product.slug}`}
        className="product-photo"
        aria-label={`Ver ${product.name}`}
      >
        <PublicImage key={product.mainImage} src={mediaUrl(product.mainImage)} alt={product.name} />
      </Link>
      <div className="product-card-copy">
        <Link className="product-store" to={`/tiendas/${product.business.slug}`}>
          {product.business.name}
        </Link>
        <h3>
          <Link to={`/productos/${product.slug}`}>{product.name}</Link>
        </h3>
        <p className="product-price">{money(product.price)}</p>
        <span className="product-category">{product.category.name}</span>
      </div>
    </article>
  );
}
