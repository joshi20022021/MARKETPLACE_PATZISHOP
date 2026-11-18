import { Link } from 'react-router-dom';

const discoveries = [
  {
    number: '01',
    title: 'Encuentra algo tuyo.',
    description: 'Explora productos, compara opciones y descubre lo que se hace cerca.',
    to: '/catalogo',
    label: 'Recorrer el catálogo',
    style: 'clay',
  },
  {
    number: '02',
    title: 'Ponle nombre a lo local.',
    description: 'Conoce las tiendas y a los negocios que forman nuestra comunidad.',
    to: '/tiendas',
    label: 'Conocer las tiendas',
    style: 'olive',
  },
  {
    number: '03',
    title: 'Dale espacio a tu idea.',
    description: 'Tu negocio también puede tener su propia vitrina en PatziShop.',
    to: '/registro?tipo=vendedor',
    label: 'Empezar a vender',
    style: 'ochre',
  },
];

export function HomePage() {
  return (
    <>
      <section className="local-hero wrap" aria-labelledby="home-title">
        <div className="local-hero-copy">
          <p className="eyebrow">
            <span className="small-dot" /> EL MERCADO DE NUESTRA COMUNIDAD
          </p>
          <h1 id="home-title">
            Hecho cerca.
            <br />
            Elegido <em>por ti.</em>
          </h1>
          <p className="local-hero-description">
            Hay mucho por descubrir a la vuelta de casa. Encuentra productos, conoce negocios y
            lleva contigo un poquito de Patzicía.
          </p>
          <div className="local-hero-actions">
            <Link className="button" to="/catalogo">
              Explorar productos <span aria-hidden="true">↗</span>
            </Link>
            <Link className="local-secondary-link" to="/tiendas">
              Conocer las tiendas <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="local-origin">
            <span aria-hidden="true">✳</span>
            <p>
              Lo nuestro tiene su encanto.
              <br />
              <strong>Descúbrelo, apóyalo, compártelo.</strong>
            </p>
          </div>
        </div>
        <figure className="local-hero-visual">
          <div className="local-photo-frame">
            <img
              src="/images/comunidad-artesana.webp"
              width="1440"
              height="960"
              fetchPriority="high"
              alt="Composición editorial de cerámica de barro, una cesta y un tejido en tonos verdes y cálidos"
            />
          </div>
          <div className="local-seal" aria-hidden="true">
            <span>DE NUESTRA</span>
            <strong>tierra.</strong>
            <span>CON MUCHO ORGULLO</span>
          </div>
          <figcaption>
            <span>OBJETOS CON TEXTURA. IDEAS CON RAÍCES.</span>
            <span>Imagen ambiental · generada con IA</span>
          </figcaption>
          <div className="local-photo-note" aria-hidden="true">
            Pequeños hallazgos.
            <br />
            <em>Grandes historias.</em>
          </div>
        </figure>
      </section>
      <div className="local-ribbon" aria-hidden="true">
        <span>COMERCIO LOCAL</span>
        <b>✳</b>
        <span>IDEAS QUE CONECTAN</span>
        <b>✳</b>
        <span>ORGULLO DE PATZICÍA</span>
        <b>✳</b>
        <span>COMERCIO LOCAL</span>
      </div>
      <section className="local-discover wrap" aria-labelledby="discover-title">
        <div className="local-section-heading">
          <div>
            <p className="eyebrow">MUY DE AQUÍ. MUY PARA TI.</p>
            <h2 id="discover-title">
              Tu próximo descubrimiento
              <br />
              empieza <em>cerca.</em>
            </h2>
          </div>
          <p>
            Un lugar para encontrar lo que buscas
            <br />y conocer lo que todavía no conocías.
          </p>
        </div>
        <div className="local-discovery-grid">
          {discoveries.map((item) => (
            <Link
              key={item.number}
              to={item.to}
              className={`local-discovery local-discovery-${item.style}`}
            >
              <div className="local-discovery-top">
                <span>{item.number} / PATZISHOP</span>
                <span className="local-link-arrow" aria-hidden="true">
                  ↗
                </span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <span className="local-discovery-label">
                {item.label} <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="local-community wrap" aria-labelledby="community-title">
        <div className="local-community-symbol" aria-hidden="true">
          ✳
        </div>
        <div>
          <p className="eyebrow">LAS BUENAS HISTORIAS SE HACEN EN COMUNIDAD</p>
          <h2 id="community-title">
            Aquí también
            <br />
            hay lugar <em>para ti.</em>
          </h2>
          <p>Compra cerca. Comparte tu talento. Hagamos crecer lo nuestro.</p>
          <Link className="button button-light" to="/registro">
            Crea tu cuenta <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <span className="local-community-location">
          PATZICÍA
          <br />
          CHIMALTENANGO · GT
        </span>
      </section>
    </>
  );
}
