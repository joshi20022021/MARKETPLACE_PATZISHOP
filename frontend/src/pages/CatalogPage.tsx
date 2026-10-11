import { Link } from 'react-router-dom';
import { CatalogResults } from '../components/CatalogResults';
export function CatalogPage() {
  return (
    <section className="wrap marketplace-page">
      <div className="market-heading">
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
