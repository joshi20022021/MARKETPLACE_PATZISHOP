import { Link } from 'react-router-dom';
import { CatalogResults } from '../components/CatalogResults';
import { ShopIcon } from '../components/ShopIcon';
export function CatalogPage() {
  return (
    <section className="wrap marketplace-page">
      <div className="market-heading relative isolate overflow-hidden">
        <ShopIcon
          name="bag"
          className="pointer-events-none absolute -top-10 right-12 -z-10 hidden size-64 rotate-12 text-patzi-green/5 lg:block"
        />
        <div>
          <p className="eyebrow">DESCUBRE NUESTRA COMUNIDAD</p>
          <h1>
            Cosas buenas,
            <br />
            <em>hechas cerca.</em>
          </h1>
          <p>Encuentra el talento y los productos de nuestros negocios locales.</p>
        </div>
        <Link className="text-link" to="/tiendas">
          Conoce nuestras tiendas ↗
        </Link>
      </div>
      <CatalogResults />
    </section>
  );
}
