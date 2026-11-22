import { Link } from 'react-router-dom';
import { ShopIcon } from '../components/ShopIcon';

const discoveries = [
  {
    number: '01',
    title: 'Algo especial te está esperando.',
    description:
      'Encuentra productos con personalidad y descubre lo que ofrecen nuestros negocios.',
    to: '/catalogo',
    label: 'Recorrer el catálogo',
    icon: 'bag',
    tone: 'bg-patzi-gold/40',
    size: 'md:col-span-2',
    decoration: 'bg-patzi-gold/50',
  },
  {
    number: '02',
    title: 'Detrás hay una historia.',
    description: 'Ponle nombre y rostro al comercio de nuestra comunidad.',
    to: '/tiendas',
    label: 'Conocer las tiendas',
    icon: 'store',
    tone: 'bg-white',
    size: '',
    decoration: 'bg-patzi-sage',
  },
  {
    number: '03',
    title: 'Tu talento tiene lugar aquí.',
    description: 'Abre tu propia vitrina y haz que más personas descubran tu negocio.',
    to: '/registro?tipo=vendedor',
    label: 'Empezar a vender',
    icon: 'spark',
    tone: 'bg-patzi-sage',
    size: '',
    decoration: 'bg-white/70',
  },
] as const;

export function HomePage() {
  return (
    <>
      <section className="wrap pt-5 md:pt-8" aria-labelledby="home-title">
        <div className="relative isolate grid overflow-hidden rounded-[2rem] bg-patzi-ink text-white lg:min-h-[590px] lg:grid-cols-[1.05fr_1fr] lg:rounded-[2.5rem]">
          <div className="relative z-10 px-7 pt-10 pb-9 sm:px-12 sm:pt-14 lg:py-16 lg:pl-16 lg:pr-8">
            <p className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-white/20 px-3.5 py-2 text-[9px] font-semibold tracking-[0.16em] text-patzi-gold sm:text-[10px]">
              <span className="size-1.5 rounded-full bg-patzi-gold" /> DE PATZICÍA, CON ORGULLO
            </p>
            <h1
              id="home-title"
              className="mb-6 font-sans text-[clamp(2.8rem,6.4vw,6rem)] font-semibold leading-[0.99] tracking-[-0.055em]"
            >
              Hecho cerca.
              <br />
              Elegido{' '}
              <span className="font-editorial font-normal italic text-patzi-gold">por ti.</span>
            </h1>
            <p className="mb-8 max-w-sm text-sm leading-7 text-white/75 sm:text-base">
              Las mejores cosas no siempre están lejos. Descubre productos, encuentra tu próxima
              tienda favorita y conecta con lo nuestro.
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link className="button button-light min-h-13 px-6" to="/catalogo">
                Explorar productos <ShopIcon name="arrow" className="size-4" />
              </Link>
              <Link
                className="inline-flex min-h-12 items-center gap-3 text-sm font-medium text-white underline decoration-white/30 underline-offset-8 hover:decoration-patzi-gold"
                to="/tiendas"
              >
                Ver las tiendas <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="mt-9 flex items-center gap-3 border-t border-white/15 pt-5 text-xs text-white/65">
              <ShopIcon name="store" className="size-5 text-patzi-gold" />
              <span>Negocios de aquí. Una comunidad que crece.</span>
            </div>
          </div>
          <figure className="relative m-0 min-h-72 sm:min-h-96 lg:min-h-full">
            <img
              src="/images/comunidad-artesana.webp"
              width="1440"
              height="960"
              fetchPriority="high"
              className="absolute inset-0 size-full object-cover object-[58%_center]"
              alt="Composición editorial de cerámica de barro, una cesta y un tejido en tonos verdes y cálidos"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent lg:bg-linear-to-r lg:from-patzi-ink/35 lg:via-transparent"
              aria-hidden="true"
            />
            <div
              className="absolute top-5 right-5 grid size-21 rotate-12 place-content-center rounded-full border border-patzi-gold/70 bg-patzi-gold text-center text-patzi-ink shadow-xl sm:size-25 lg:top-8 lg:right-8"
              aria-hidden="true"
            >
              <span className="text-[8px] font-bold tracking-widest">HECHO CON</span>
              <span className="font-editorial text-2xl italic">raíces.</span>
              <span className="mt-1 text-[7px] tracking-widest">PATZISHOP · GT</span>
            </div>
            <figcaption className="absolute inset-x-6 bottom-5 flex flex-wrap items-end justify-between gap-3 text-white sm:inset-x-8">
              <span className="font-editorial text-2xl italic sm:text-3xl">
                Lo nuestro tiene su encanto.
              </span>
              <span className="text-[9px] text-white/80">Imagen ambiental · generada con IA</span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section
        className="wrap grid gap-5 border-b border-patzi-green/15 py-7 sm:grid-cols-3 md:gap-8 md:py-9"
        aria-label="El mercado de nuestra comunidad"
      >
        {[
          {
            icon: 'store',
            title: 'Compra con sentido local',
            text: 'Conoce los negocios de tu comunidad.',
          },
          {
            icon: 'bag',
            title: 'Encuentra a tu manera',
            text: 'Explora, filtra y descubre a tu ritmo.',
          },
          {
            icon: 'spark',
            title: 'Haz crecer lo nuestro',
            text: 'Cada conexión abre una oportunidad.',
          },
        ].map((item) => (
          <div key={item.title} className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-patzi-sage text-patzi-green">
              <ShopIcon name={item.icon as 'store' | 'bag' | 'spark'} className="size-5" />
            </span>
            <div>
              <h2 className="mb-1 text-xs font-bold md:text-sm">{item.title}</h2>
              <p className="mb-0 text-xs leading-5 text-patzi-muted">{item.text}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="wrap py-12 md:py-18" aria-labelledby="discover-title">
        <div className="mb-7 flex flex-col justify-between gap-5 md:mb-9 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-[10px] font-bold tracking-[0.2em] text-patzi-coral">
              TU COMUNIDAD, A UN CLIC
            </p>
            <h2
              id="discover-title"
              className="mb-0 text-3xl font-semibold leading-tight tracking-tight md:text-5xl"
            >
              Hay mucho por{' '}
              <span className="font-editorial font-normal italic text-patzi-coral">descubrir.</span>
            </h2>
          </div>
          <p className="mb-0 max-w-xs text-sm leading-6 text-patzi-muted">
            Productos con personalidad.
            <br />
            Personas con ganas de compartir lo que hacen.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-4 md:gap-5">
          {discoveries.map((item) => (
            <Link
              key={item.number}
              to={item.to}
              className={`group relative isolate flex min-h-80 flex-col overflow-hidden rounded-3xl border border-patzi-green/10 p-7 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-patzi-green/5 motion-reduce:transform-none ${item.tone} ${item.size}`}
            >
              <div
                className={`pointer-events-none absolute -top-10 -right-10 -z-10 size-44 rounded-full ${item.decoration}`}
                aria-hidden="true"
              />
              <div className="mb-8 flex items-center justify-between">
                <span className="text-[9px] font-bold tracking-widest text-patzi-muted">
                  {item.number} / EXPLORA
                </span>
                <ShopIcon name={item.icon} className="size-8" />
              </div>
              <h3 className="mb-3 max-w-xs font-sans text-2xl font-semibold leading-tight tracking-tight lg:text-[28px]">
                {item.title}
              </h3>
              <p className="mb-7 max-w-sm text-sm leading-6 text-patzi-muted">{item.description}</p>
              <span className="mt-auto flex items-center justify-between gap-2 border-t border-patzi-green/15 pt-5 text-xs font-bold">
                {item.label}
                <ShopIcon
                  name="arrow"
                  className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap mb-14 md:mb-20" aria-labelledby="community-title">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-patzi-sage px-7 py-10 sm:p-12 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <ShopIcon
            name="spark"
            className="pointer-events-none absolute -top-20 -right-14 -z-10 size-80 rotate-12 text-patzi-green/5"
          />
          <div>
            <p className="mb-4 text-[10px] font-bold tracking-[0.16em] text-patzi-coral">
              LAS BUENAS IDEAS MERECEN SER VISTAS
            </p>
            <h2
              id="community-title"
              className="mb-4 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl"
            >
              Tu próxima historia
              <br />
              puede empezar <em className="font-editorial font-normal text-patzi-coral">aquí.</em>
            </h2>
            <p className="mb-7 max-w-md text-sm leading-7 text-patzi-muted lg:mb-0">
              Para quien encuentra algo especial. Para quien lo crea.
              <br className="hidden sm:block" /> PatziShop es el punto de encuentro.
            </p>
          </div>
          <div className="shrink-0">
            <Link className="button" to="/registro">
              Crea tu cuenta <ShopIcon name="arrow" className="size-4" />
            </Link>
            <p className="mt-3 mb-0 text-center text-[11px] text-patzi-muted">
              Forma parte de nuestra comunidad.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
