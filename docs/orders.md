# Pedidos multi-vendedor — fase 14

Confirmación CUSTOMER con pedido global, un subpedido CONFIRMED por negocio, líneas históricas,
entrega copiada, descuento de inventario y vaciado de carrito en una sola transacción PostgreSQL.
Contra entrega queda PENDING; SIMULATED queda PAID con señal explícita de prueba, sin cobrar dinero real.
No se integran tarjetas ni proveedores externos. Envío no incluido en el total de productos.

## Contratos HTTP

| Método | Ruta                               | Acceso   | Contrato                                                                        |
| ------ | ---------------------------------- | -------- | ------------------------------------------------------------------------------- |
| POST   | `/api/v1/orders`                   | CUSTOMER | Entrega/método de checkout, reviewVersion SHA-256 e idempotencyKey UUID v4; 201 |
| GET    | `/api/v1/orders`                   | CUSTOMER | Historial propio paginado                                                       |
| GET    | `/api/v1/orders/:id`               | CUSTOMER | Pedido propio con subpedidos y entrega                                          |
| GET    | `/api/v1/orders/confirmation/:key` | CUSTOMER | Recuperación del intento propio por UUID v4                                     |
| GET    | `/api/v1/seller/orders`            | SELLER   | Solo subpedidos del negocio propio, paginados                                   |
| GET    | `/api/v1/seller/orders/:id`        | SELLER   | Solo subpedido propio con datos de entrega necesarios                           |

GETs y POST llevan no-store; requieren JWT, sesión y usuario activos, roles exactos y cuotas existentes.
ADMIN no hereda esos permisos. IDs inexistentes/ajenos comparten 404. Las listas admiten page 1–10000
y limit 1–50 (predeterminados 1/12), orden estable y total coherente; campos extra se rechazan.
El vendedor no recibe total global ni líneas de otras tiendas. No hay cambios de estado, cancelación,
devolución de stock ni dashboards en esta fase: corresponden a etapas siguientes.

## Revisión e idempotencia

Preview sigue sin efectos comerciales y siempre prepara pago PENDING. Ahora canPlaceOrder=true
y reviewVersion enlaza identidad, entrega normalizada, método y productos/cantidades/precios/nombres
de esa revisión. Es una huella de cambios, no un token de pago ni una reserva.
Confirmar relee la BD: disponibilidad inválida produce 409 CART_NEEDS_ATTENTION; diferencias
con lo revisado producen CHECKOUT_CHANGED. Se debe revisar otra vez; no se acepta total del cliente.
ORDER_TOTAL_LIMIT evita superar el Decimal(14,2) existente (999999999999.99).

La migración 20261018000100 añade idempotencyKey/requestHash opcionales a Order para conservar
filas previas, un índice único por cliente/clave y una restricción de pareja/hash válido. Las compras
nuevas siempre guardan ambos. Igual cliente, clave y solicitud normalizada devuelve el mismo pedido,
incluso después de vaciar el carrito o modificar su contenido. Reutilizar clave con otra solicitud
produce 409 IDEMPOTENCY_KEY_REUSED. No se exponen clave/hash internos en los recibos.

React guarda únicamente el UUID de intento por usuario/pestaña en sessionStorage, nunca entrega,
token ni importe. La confirmación no se reintenta por fallos de red. Un resultado incierto inicia una
consulta GET del intento; al recargar se recupera mediante el UUID si el almacenamiento está disponible.
Si la consulta falla se ofrece comprobar otra vez; solo un 404 permite volver a revisar. Si sessionStorage
no está disponible, el intento vive en memoria y el historial permite recuperación manual.
El GET de recuperación toma el mismo bloqueo del carrito antes de responder.

## Transacción y datos históricos

1. Bloqueo transaccional del carrito por cliente, compartido con sus mutaciones.
2. Filas de productos bloqueadas FOR UPDATE en orden de ID; tiendas, categorías y usuarios FOR SHARE.
3. Revalidación de rol/actividad, visibilidad, cantidades, versión y límite monetario.
4. Order, SellerOrder, OrderItem y estado inicial con actor, stockDeductedAt y movimientos OUT negativos.
5. Resultado de pago local, vaciado del carrito y commit; cualquier error revierte todas las escrituras.

Los bloqueos evitan stock negativo ante compradores simultáneos y se toman en un orden estable.
Un bloqueo/timeout puede requerir comprobar el intento; no deben crearse claves nuevas a ciegas.
Los números autoincrementales pueden tener huecos por transacciones revertidas.
OrderItem conserva nombre, SKU y precio; Order conserva entrega, método e importe. El recibo del cliente
no devuelve SKU privado. Las tiendas se identifican mediante la relación actual, por lo que su nombre
puede cambiar; eso no altera importes ni productos históricos.

PaymentService.complete es local y síncrono, separado de prepare. Los proveedores reales requerirán
un diseño externo idempotente de cobro/webhooks; no se deben introducir llamadas remotas dentro de
esta transacción SQL. Un PAID con método SIMULATED siempre es una simulación.

## Pantallas y comprobación

Checkout permite confirmar después de revisar. `/pedidos` lista el historial propio y
`/pedidos/:id` muestra recibo, entrega y estados por tienda. El vendedor tiene consulta HTTP acotada;
su dashboard se construye en fase 15 y la gestión de estados en fase 16.

```powershell
npm run prisma:generate
npm run prisma:deploy
npm run test:orders
npm run test:checkout
npm run test:cart
npm run test:security
npm run test:products
npm run test:api
npm run test:database
npm run test:frontend
npm run build:backend
npm run build:frontend
npm run check
```

Las pruebas usan PostgreSQL real y fixtures propias para snapshots, separación, precisión,
idempotencia, concurrencia, rollback, visibilidad, aislamiento, límites y OpenAPI.
