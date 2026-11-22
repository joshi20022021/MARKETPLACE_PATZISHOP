import { Link } from 'react-router-dom';
import { mediaUrl, money, type PublicProduct } from '../services/marketplace';
import { PublicImage } from './PublicImage';
import { ShopIcon } from './ShopIcon';
export function ProductCard({ product }: { product: PublicProduct }) {
  return (
    <article className="group flex min-w-0 flex-col rounded-3xl border border-patzi-green/10 bg-white p-2.5 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-patzi-green/10 motion-reduce:transform-none">
      <Link
        to={`/productos/${product.slug}`}
        className="relative block overflow-hidden rounded-2xl [&_img]:transition-transform [&_img]:duration-500 hover:[&_img]:scale-105 motion-reduce:[&_img]:transform-none"
        aria-label={`Ver ${product.name}`}
      >
        <PublicImage key={product.mainImage} src={mediaUrl(product.mainImage)} alt={product.name} />
        <span
          aria-hidden="true"
          className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-full bg-white/95 text-patzi-green shadow-sm transition-colors group-hover:bg-patzi-gold"
        >
          <ShopIcon name="arrow" className="size-4" />
        </span>
      </Link>
      <div className="flex flex-1 flex-col px-2 pt-4 pb-3 sm:px-3">
        <Link
          className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-patzi-muted hover:underline"
          to={`/tiendas/${product.business.slug}`}
        >
          <ShopIcon name="store" className="size-3.5 shrink-0" />
          <span className="break-words">{product.business.name}</span>
        </Link>
        <h3 className="mb-4 font-sans text-base font-semibold leading-snug tracking-tight wrap-anywhere sm:text-lg">
          <Link className="hover:underline" to={`/productos/${product.slug}`}>
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-patzi-green/10 pt-4">
          <p className="mb-0 text-lg font-bold tracking-tight text-patzi-green">
            {money(product.price)}
          </p>
          <span className="max-w-full rounded-md bg-patzi-sage px-2 py-1 text-[9px] font-semibold text-patzi-muted wrap-anywhere">
            {product.category.name}
          </span>
        </div>
      </div>
    </article>
  );
}
