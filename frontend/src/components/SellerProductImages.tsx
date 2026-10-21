import { useEffect, useRef, useState } from 'react';
import { api, useSession } from '../services/session';
import { sellerProductSchema, type SellerProduct } from '../services/seller';
export function SellerProductImages({
  product,
  disabled,
  run,
}: {
  product: SellerProduct;
  disabled: boolean;
  run: (work: () => Promise<() => void>) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [remove, setRemove] = useState<string | null>(null);
  const session = useSession();
  return (
    <section className="form-card seller-images">
      <h2>Imágenes del producto</h2>
      <p>
        Hasta seis imágenes JPEG, PNG o WebP de 5 MiB como máximo. La primera disponible es la
        portada.
      </p>
      <div className="seller-image-grid">
        {product.images.map((image, index) => (
          <article key={image.id}>
            <PrivateImage productId={product.id} imageId={image.id} />
            <p>{index === 0 ? 'Portada' : `Imagen ${index + 1}`}</p>
            {remove === image.id ? (
              <div>
                <p>¿Eliminar esta imagen?</p>
                <button
                  className="button button-small"
                  disabled={disabled}
                  onClick={() =>
                    void run(async () => {
                      await api.delete(`/seller/products/${product.id}/images/${image.id}`);
                      return () => setRemove(null);
                    })
                  }
                >
                  Confirmar eliminación
                </button>
                <button
                  className="button button-outline button-small"
                  disabled={disabled}
                  onClick={() => setRemove(null)}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                className="button button-outline button-small"
                disabled={disabled}
                onClick={() => setRemove(image.id)}
              >
                Quitar imagen {index + 1}
              </button>
            )}
          </article>
        ))}
      </div>
      {!product.images.length && <p>Aún no has añadido imágenes.</p>}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (disabled || !file) return;
          setError('');
          if (
            !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
            file.size > 5 * 1024 * 1024 ||
            !file.size
          ) {
            setError('Selecciona una imagen JPEG, PNG o WebP de hasta 5 MiB.');
            return;
          }
          void run(async () => {
            const body = new FormData();
            body.append('file', file);
            sellerProductSchema.parse(
              (await api.post(`/seller/products/${product.id}/images`, body)).data,
            );
            return () => {
              if (useSession.getState().epoch === session.epoch) {
                setFile(null);
                if (input.current) input.current.value = '';
              }
            };
          });
        }}
      >
        <label htmlFor="product-image-upload">Seleccionar imagen</label>
        <input
          id="product-image-upload"
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled || product.images.length >= 6}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setError('');
          }}
        />
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        <button className="button" disabled={disabled || !file || product.images.length >= 6}>
          Subir imagen
        </button>
      </form>
    </section>
  );
}
function PrivateImage({ productId, imageId }: { productId: string; imageId: string }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const session = useSession();
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = '';
    void api
      .get(`/seller/products/${productId}/images/${imageId}/file`, {
        responseType: 'blob',
        signal: controller.signal,
      })
      .then((response) => {
        if (controller.signal.aborted || useSession.getState().epoch !== session.epoch) return;
        objectUrl = URL.createObjectURL(response.data as Blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [productId, imageId, session.epoch]);
  return url ? (
    <img src={url} alt="Vista previa privada del producto" />
  ) : (
    <p role="status">{failed ? 'No se pudo cargar la vista previa.' : 'Cargando imagen…'}</p>
  );
}
