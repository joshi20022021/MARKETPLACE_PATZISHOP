import { useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, useSession } from '../services/session';
import { categories } from '../services/marketplace';
import {
  type ProductInput,
  type SellerProduct,
  productInputSchema,
  productPatch,
  productStates,
  sellerProductSchema,
  useSellerBusiness,
  invalidateSeller,
  sellerError,
} from '../services/seller';
import { FormField } from '../components/FormField';
import { RemoteError } from '../components/RemoteState';
import { SellerNav } from '../components/SellerNav';
import { SellerProductImages } from '../components/SellerProductImages';
export function SellerProductPage() {
  const session = useSession();
  const { id } = useParams();
  const shop = useSellerBusiness();
  const product = useQuery({
    queryKey: ['seller-product', session.user?.id, session.epoch, id],
    enabled: !!id && !!shop.data && session.user?.role === 'SELLER',
    queryFn: async ({ signal }) =>
      sellerProductSchema.parse(
        (await api.get(`/seller/products/${encodeURIComponent(id!)}`, { signal })).data,
      ),
  });
  const cats = useQuery({
    queryKey: ['public-categories'],
    queryFn: ({ signal }) => categories(signal),
  });
  return (
    <section className="wrap marketplace-page seller-page">
      <SellerNav />
      <Link className="back-link" to="/vendedor/productos">
        ← Mis productos
      </Link>
      <div className="market-heading">
        <div>
          <p className="eyebrow">LO QUE OFRECES, A TU MANERA</p>
          <h1>
            {id ? 'Tu' : 'Nuevo'} <em>producto.</em>
          </h1>
        </div>
      </div>
      {shop.isPending ? (
        <p role="status">Cargando tu tienda…</p>
      ) : shop.isError ? (
        <RemoteError error={shop.error} retry={() => void shop.refetch()} />
      ) : !shop.data ? (
        <div className="form-card">
          <h2>Primero presenta tu tienda</h2>
          <Link className="button" to="/cuenta/tienda">
            Crear mi tienda ↗
          </Link>
        </div>
      ) : id && product.isPending ? (
        <p role="status">Cargando producto…</p>
      ) : id && product.isError ? (
        <>
          <RemoteError
            resource="Este producto"
            error={product.error}
            retry={() => void product.refetch()}
          />
          <Link to="/vendedor/productos">Volver a mis productos</Link>
        </>
      ) : cats.isPending ? (
        <p role="status">Cargando categorías…</p>
      ) : cats.isError ? (
        <RemoteError error={cats.error} retry={() => void cats.refetch()} />
      ) : (
        <ProductEditor
          key={`${session.user?.id}:${session.epoch}:${id ?? 'new'}`}
          product={id ? product.data : undefined}
          categories={cats.data}
          businessStatus={shop.data.status}
        />
      )}
    </section>
  );
}
function values(product?: SellerProduct): ProductInput {
  return {
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    description: product?.description ?? '',
    categoryId: product?.categoryId ?? '',
    price: product?.price ?? '',
    sku: product?.sku ?? '',
    stock: product?.stock ?? 0,
    status: product?.status ?? 'INACTIVE',
  };
}
function ProductEditor({
  product,
  categories,
  businessStatus,
}: {
  product?: SellerProduct;
  categories: { id: string; name: string }[];
  businessStatus: string;
}) {
  const session = useSession();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [base, setBase] = useState(product);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const editable = ['ACTIVE', 'PENDING'].includes(businessStatus);
  const disabled = busy || uncertain || !editable;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(productInputSchema),
    defaultValues: values(base),
  });
  function accept(value: SellerProduct) {
    setBase(value);
    reset(values(value));
    client.setQueryData(['seller-product', session.user?.id, session.epoch, value.id], value);
  }
  async function run(work: () => Promise<() => void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const done = await work();
      if (!mounted.current || useSession.getState().epoch !== session.epoch) return;
      done();
      invalidateSeller(client);
    } catch (cause) {
      if (!mounted.current || useSession.getState().epoch !== session.epoch) return;
      setError(sellerError(cause));
      if (!isAxiosError(cause) || !cause.response || cause.response.status >= 500)
        setUncertain(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      {!editable && (
        <p className="checkout-notice">
          La tienda está suspendida o no aprobada. Puedes consultar sus productos; no modificarlos.
        </p>
      )}
      {error && (
        <p className="form-alert" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="form-success" role="status">
          Producto guardado.
        </p>
      )}
      {uncertain && (
        <div className="checkout-notice">
          <p>
            Comprueba el resultado antes de repetir la operación. Volver a cargar descarta los
            cambios sin guardar.
          </p>
          {base ? (
            <button
              className="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const current = sellerProductSchema.parse(
                    (await api.get(`/seller/products/${base.id}`)).data,
                  );
                  return () => {
                    accept(current);
                    setUncertain(false);
                  };
                })
              }
            >
              Volver a cargar datos
            </button>
          ) : (
            <Link className="button" to="/vendedor/productos">
              Consultar mis productos
            </Link>
          )}
        </div>
      )}
      <div className="form-card seller-editor">
        <form
          noValidate
          onSubmit={handleSubmit((input) => {
            if (disabled) return;
            const patch = base ? productPatch(input, base) : input;
            if (!Object.keys(patch).length) {
              setSaved(true);
              return;
            }
            void run(async () => {
              const result = sellerProductSchema.parse(
                (base
                  ? await api.patch(`/seller/products/${base.id}`, patch)
                  : await api.post('/seller/products', input)
                ).data,
              );
              return () => {
                accept(result);
                setSaved(true);
                if (!base) navigate(`/vendedor/productos/${result.id}/editar`, { replace: true });
              };
            });
          })}
        >
          <fieldset disabled={disabled}>
            <legend>Datos del producto</legend>
            <FormField
              label="Nombre del producto"
              registration={register('name')}
              error={errors.name?.message}
              maxLength={180}
            />
            <div className="form-row">
              <FormField
                label="Identificador del producto"
                registration={register('slug')}
                error={errors.slug?.message}
                maxLength={220}
                hint="Ejemplo: bolso-tejido. Debe ser único."
              />
              <FormField
                label="SKU"
                registration={register('sku')}
                error={errors.sku?.message}
                maxLength={80}
              />
            </div>
            <div className="field">
              <label htmlFor="seller-category">Categoría</label>
              <select
                id="seller-category"
                {...register('categoryId')}
                aria-invalid={!!errors.categoryId}
                aria-describedby={errors.categoryId ? 'category-error' : undefined}
              >
                <option value="">Selecciona una categoría</option>
                {base && !categories.some((c) => c.id === base.categoryId) && (
                  <option value={base.categoryId}>Categoría actual (no disponible)</option>
                )}
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <small className="field-error" id="category-error">
                  {errors.categoryId.message}
                </small>
              )}
            </div>
            <div className="field">
              <label htmlFor="seller-description">Descripción</label>
              <textarea
                id="seller-description"
                rows={5}
                maxLength={10000}
                {...register('description')}
                aria-invalid={!!errors.description}
              />
              {errors.description && (
                <small className="field-error">{errors.description.message}</small>
              )}
            </div>
            <div className="form-row">
              <FormField
                label="Precio (GTQ)"
                inputMode="decimal"
                registration={register('price')}
                error={errors.price?.message}
                hint="Usa punto decimal, por ejemplo 125.50."
              />
              <FormField
                label="Existencias"
                type="number"
                min={0}
                max={2147483647}
                step={1}
                registration={register('stock', { valueAsNumber: true })}
                error={errors.stock?.message}
              />
            </div>
            <div className="field">
              <label htmlFor="seller-status">Estado del producto</label>
              <select id="seller-status" {...register('status')}>
                {Object.entries(productStates).map(([value, label]) => (
                  <option
                    key={value}
                    value={value}
                    disabled={businessStatus === 'PENDING' && value !== 'INACTIVE'}
                  >
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <p className="field-hint">
              Las existencias son una cantidad absoluta. Solo se envían los campos modificados.
              Activar requiere tienda aprobada y categoría disponible; cero unidades queda agotado.
            </p>
            <button className="button" type="submit">
              {busy ? 'Guardando…' : base ? 'Guardar producto' : 'Crear producto'}
            </button>
          </fieldset>
        </form>
      </div>
      {base ? (
        <SellerProductImages product={product ?? base} disabled={disabled} run={run} />
      ) : (
        <p>Después de crear el producto podrás añadir hasta seis imágenes.</p>
      )}
      {base && editable && (
        <section className="seller-delete">
          <h2>Retirar producto</h2>
          <p>
            Un producto con compras se conserva por su historial; puedes cambiar su estado a
            Inactivo.
          </p>
          {deleting ? (
            <div>
              <p>¿Eliminar este producto y sus imágenes? Esta acción no se puede deshacer.</p>
              <button
                className="button"
                disabled={disabled}
                onClick={() =>
                  void run(async () => {
                    await api.delete(`/seller/products/${base.id}`);
                    return () => navigate('/vendedor/productos', { replace: true });
                  })
                }
              >
                Eliminar definitivamente
              </button>
              <button
                className="button button-outline"
                disabled={busy}
                onClick={() => setDeleting(false)}
              >
                Cancelar eliminación
              </button>
            </div>
          ) : (
            <button
              className="button button-outline"
              disabled={disabled}
              onClick={() => setDeleting(true)}
            >
              Eliminar producto
            </button>
          )}
        </section>
      )}
    </>
  );
}
