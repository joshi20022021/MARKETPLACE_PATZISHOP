import * as ui from './ui';
import { orderStatus, type OrderPart } from '../services/orders';
export function OrderHistory({ history }: { history: OrderPart['history'] }) {
  return (
    <div className={ui.orderHistory}>
      <h4>Historial del subpedido</h4>
      {history.length ? (
        <ol>
          {history.map((entry) => (
            <li key={entry.id}>
              <strong>
                {entry.fromStatus ? `${orderStatus[entry.fromStatus]} → ` : ''}
                {orderStatus[entry.toStatus]}
              </strong>
              <time dateTime={entry.createdAt}>
                {new Date(entry.createdAt).toLocaleString('es-GT')}
              </time>
              {entry.note && <p className={ui.preserveText}>{entry.note}</p>}
            </li>
          ))}
        </ol>
      ) : (
        <p>Este subpedido no tiene historial registrado.</p>
      )}
    </div>
  );
}
