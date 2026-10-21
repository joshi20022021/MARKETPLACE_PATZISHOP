import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, useSession } from '../services/session';
import {
  businessSchema,
  businessInputSchema,
  type Business,
  type BusinessInput,
} from '../services/contracts';
import { errorMessage, statusOf } from '../services/errors';
import { FormField } from '../components/FormField';
import { SellerNav } from '../components/SellerNav';
export function ShopPage() {
  const user = useSession((state) => state.user);
  const shop = useQuery({
    queryKey: ['shop', user?.id],
    queryFn: async ({ signal }) => {
      try {
        return businessSchema.parse((await api.get('/seller/business', { signal })).data);
      } catch (error) {
        if (statusOf(error) === 404) return null;
        throw error;
      }
    },
  });
  if (shop.isPending)
    return (
      <div className="wrap page-state" role="status">
        Cargando tu tienda…
      </div>
    );
  if (shop.isError)
    return (
      <div className="wrap page-state">
        <p role="alert">{errorMessage(shop.error)}</p>
        <button className="button" onClick={() => void shop.refetch()}>
          Reintentar
        </button>
      </div>
    );
  return <ShopForm shop={shop.data} />;
}
function ShopForm({ shop }: { shop: Business | null }) {
  const user = useSession((state) => state.user);
  const client = useQueryClient();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BusinessInput>({
    resolver: zodResolver(businessInputSchema),
    defaultValues: {
      name: shop?.name ?? '',
      slug: shop?.slug ?? '',
      description: shop?.description ?? '',
      email: shop?.email ?? user?.email ?? '',
      phone: shop?.phone ?? '',
      address: shop?.address ?? '',
      logo: shop?.logo ?? '',
      banner: shop?.banner ?? '',
    },
  });
  const labels = {
    PENDING: 'En revisión',
    ACTIVE: 'Activa',
    SUSPENDED: 'Suspendida',
    REJECTED: 'No aprobada',
  };
  return (
    <section className="wrap account-page shop-page">
      <SellerNav />
      <Link className="back-link" to="/cuenta">
        ← Mi cuenta
      </Link>
      <p className="eyebrow">TU NEGOCIO, MÁS CERCA</p>
      <h1>{shop ? 'Mi tienda' : 'Presenta tu tienda'}</h1>
      <p className="page-intro">Cuéntanos qué hace especial a tu negocio.</p>
      <div className="account-grid">
        <div className="form-card">
          <h2>Datos del negocio</h2>
          <form
            noValidate
            onSubmit={handleSubmit(async (values) => {
              setError('');
              setSaved(false);
              try {
                const input = {
                  ...values,
                  logo: values.logo || null,
                  banner: values.banner || null,
                };
                const response = shop
                  ? await api.patch('/seller/business', input)
                  : await api.post('/seller/business', input);
                const result = businessSchema.parse(response.data);
                client.setQueryData(['shop', user?.id], result);
                void client.invalidateQueries({ queryKey: ['seller-business'] });
                void client.invalidateQueries({ queryKey: ['seller-dashboard'] });
                setSaved(true);
              } catch (cause) {
                setError(errorMessage(cause));
              }
            })}
          >
            <FormField
              label="Nombre de la tienda"
              registration={register('name')}
              error={errors.name?.message}
              maxLength={120}
            />
            <FormField
              label="Identificador de la tienda"
              registration={register('slug')}
              error={errors.slug?.message}
              hint="Ejemplo: tejidos-patzi. Debe ser único."
              maxLength={160}
              autoCapitalize="none"
            />
            <div className="field">
              <label htmlFor="shop-description">Descripción</label>
              <textarea
                id="shop-description"
                rows={4}
                maxLength={3000}
                {...register('description')}
                aria-invalid={Boolean(errors.description)}
                aria-describedby={errors.description ? 'description-error' : undefined}
              />
              {errors.description && (
                <small className="field-error" id="description-error">
                  {errors.description.message}
                </small>
              )}
            </div>
            <FormField
              label="Correo de contacto"
              type="email"
              registration={register('email')}
              error={errors.email?.message}
              autoComplete="email"
            />
            <div className="form-row">
              <FormField
                label="Teléfono"
                type="tel"
                registration={register('phone')}
                error={errors.phone?.message}
                autoComplete="tel"
              />
              <FormField
                label="Dirección"
                registration={register('address')}
                error={errors.address?.message}
                autoComplete="street-address"
              />
            </div>
            <details className="image-links">
              <summary>Imágenes de tu tienda (opcional)</summary>
              <p className="field-hint">Pega enlaces públicos HTTP(S) de tu logo y portada.</p>
              <FormField
                label="URL del logo"
                type="url"
                registration={register('logo')}
                error={errors.logo?.message}
              />
              <FormField
                label="URL de la portada"
                type="url"
                registration={register('banner')}
                error={errors.banner?.message}
              />
            </details>
            {error && (
              <p className="form-alert" role="alert">
                {error}
              </p>
            )}
            {saved && (
              <p className="form-success" role="status">
                Los datos de tu tienda se guardaron.
              </p>
            )}
            <button className="button" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : shop ? 'Guardar cambios' : 'Crear mi tienda'}
            </button>
          </form>
        </div>
        <aside className="account-aside">
          <span aria-hidden="true">✳</span>
          <h2>Un espacio para lo tuyo</h2>
          {shop && (
            <p className={`status-badge status-${shop.status.toLowerCase()}`}>
              {labels[shop.status]}
            </p>
          )}
          <p>
            {!shop || shop.status === 'PENDING'
              ? 'Las tiendas nuevas pasan por una revisión antes de publicar. Puedes completar tus datos mientras tanto.'
              : shop.status === 'ACTIVE'
                ? 'Tu tienda está aprobada. Mantén al día los datos para que tus clientes puedan encontrarte.'
                : 'Tu tienda no está disponible al público. Puedes consultar y actualizar sus datos de contacto.'}
          </p>
          <p>La información de contacto será visible cuando tu tienda esté publicada.</p>
        </aside>
      </div>
    </section>
  );
}
