import { Link } from 'react-router-dom';
import { ShopIllustration } from '../components/ShopIllustration';
export function HomePage() {
  return (
    <>
      <section className="hero wrap">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="small-dot" /> UN ENCUENTRO CON LO LOCAL
          </p>
          <h1>
            Hecho cerca.
            <br />
            Elegido <em>por ti.</em>
          </h1>
          <p className="hero-description">
            Las buenas historias empiezan en nuestra comunidad. Conectamos a las personas con los
            negocios que le dan vida a Patzicía.
          </p>
          <div className="hero-actions">
            <Link className="button" to="/registro">
              Sé parte de PatziShop <span aria-hidden="true">↗</span>
            </Link>
            <Link className="text-link" to="/registro?tipo=vendedor">
              Da el siguiente paso con tu negocio <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="hero-note">
            <span className="note-icon" aria-hidden="true">
              ⌁
            </span>
            <span>
              Personas reales. Negocios de aquí.
              <br />
              <strong>Una comunidad que crece contigo.</strong>
            </span>
          </div>
        </div>
        <div className="hero-art">
          <ShopIllustration />
          <div className="art-label">
            <span aria-hidden="true">✦</span> El valor de comprar cerca.
          </div>
          <div className="art-stamp">
            HECHO CON
            <br />
            <strong>orgullo local</strong>
            <br />
            PATZICÍA · GT
          </div>
        </div>
      </section>
      <section className="principles wrap" aria-label="Nuestra comunidad">
        <article>
          <span className="principle-number">01 / CERCA DE TI</span>
          <h2>El talento de nuestra gente.</h2>
          <p>
            Detrás de cada negocio hay una historia, una familia y muchas ganas de salir adelante.
          </p>
        </article>
        <article>
          <span className="principle-number">02 / TU PROPIO ESPACIO</span>
          <h2>Tu negocio tiene un lugar.</h2>
          <p>
            Crea tu cuenta de vendedor y presenta tu tienda a la comunidad con tu propia identidad.
          </p>
        </article>
        <article>
          <span className="principle-number">03 / JUNTOS CRECEMOS</span>
          <h2>Conectemos lo que nos une.</h2>
          <p>Forma parte de una comunidad que cree en las ideas y el comercio de nuestra tierra.</p>
        </article>
      </section>
      <section className="community wrap">
        <div>
          <p className="eyebrow">EL PRÓXIMO CAPÍTULO ES CONTIGO</p>
          <h2>
            Tu historia también
            <br />
            pertenece aquí.
          </h2>
        </div>
        <Link className="button button-light" to="/registro">
          Crea tu cuenta <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </>
  );
}
