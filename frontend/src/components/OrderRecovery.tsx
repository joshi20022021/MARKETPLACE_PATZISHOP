import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, useSession } from '../services/session';
import { statusOf } from '../services/errors';
import { clearOrderKey, orderSchema } from '../services/orders';
export function OrderRecovery({ attempt, onMissing }: { attempt: string; onMissing: () => void }) {
  const session = useSession();
  const navigate = useNavigate();
  const result = useQuery({
    queryKey: ['order-attempt', session.user?.id, session.epoch, attempt],
    retry: false,
    queryFn: async ({ signal }) => {
      try {
        return orderSchema.parse(
          (await api.get(`/orders/confirmation/${attempt}`, { signal })).data,
        );
      } catch (error) {
        if (statusOf(error) === 404) return null;
        throw error;
      }
    },
  });
  useEffect(() => {
    if (result.data && session.user && useSession.getState().epoch === session.epoch) {
      clearOrderKey(session.user.id);
      navigate(`/pedidos/${result.data.id}`, { replace: true });
    }
  }, [result.data, session.user, session.epoch, navigate]);
  return (
    <section className="wrap page-state">
      <h1>Comprobemos tu confirmación</h1>
      <p>Estamos comprobando el intento anterior para evitar una compra duplicada.</p>
      {result.isPending || result.isFetching || result.data ? (
        <p role="status">Consultando tu pedido…</p>
      ) : result.isError ? (
        <>
          <p role="alert">
            No pudimos comprobar el resultado. Consulta de nuevo antes de confirmar otra compra.
          </p>
          <button className="button" onClick={() => void result.refetch()}>
            Comprobar de nuevo
          </button>
        </>
      ) : (
        <>
          <p>No se encontró un pedido para este intento.</p>
          <button
            className="button"
            onClick={() => {
              if (session.user) clearOrderKey(session.user.id);
              onMissing();
            }}
          >
            Volver a revisar mi entrega
          </button>
        </>
      )}
      <p>
        <Link className="text-link" to="/pedidos">
          Consultar mis pedidos ↗
        </Link>
      </p>
    </section>
  );
}
