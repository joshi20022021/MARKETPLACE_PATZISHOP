# Gestión de pedidos — fase 16

Cada SellerOrder mantiene su propio estado e historial. Un vendedor nunca modifica los subpedidos
de otra tienda ni el total/pago global de Order. Las rutas exigen JWT, sesión y usuario activos,
roles exactos, propiedad en la consulta, cuotas y no-store. ADMIN no hereda estos permisos.
IDs ajenos e inexistentes comparten 404. No cambia el esquema, seed ni dependencias.

## Transiciones

| Estado actual         | Vendedor             | Cliente propietario |
| --------------------- | -------------------- | ------------------- |
| PENDING               | CONFIRMED, CANCELLED | CANCELLED           |
| CONFIRMED             | PREPARING, CANCELLED | CANCELLED           |
| PREPARING             | SHIPPED, CANCELLED   | Ninguna             |
| SHIPPED               | DELIVERED            | Ninguna             |
| DELIVERED / CANCELLED | Ninguna              | Ninguna             |

Las compras nuevas de fase 14 nacen CONFIRMED con stock descontado. PENDING se admite para
datos previos válidos: confirmar descuenta sus líneas con visibilidad/stock vigentes y conserva
los precios históricos. No se confirma un pendiente vacío ni se deduce dos veces.
El vendedor puede atender/cancelar pedidos existentes aun si la tienda está suspendida;
confirmar un PENDING requiere publicación comercial válida. No permite publicar nuevos productos.

## API y concurrencia

- PATCH `/api/v1/seller/orders/:id/status`: status, expectedStatus y note opcional (hasta 500).
- PATCH `/api/v1/orders/seller-orders/:id/cancel`: expectedStatus y note; solo CUSTOMER.
- GET `/api/v1/seller/orders`: añade filtro status a page/limit existentes; orden estable.
- GETs propios devuelven history y allowedStatuses según rol, sin actorId/nombres/correos privados.

Las notas son visibles tanto al cliente como al vendedor. Se recortan y se rechazan controles,
tipos incorrectos, null y campos extra. El actor real queda guardado en BD desde el JWT.
No se acepta inventario, actor ni fechas del cuerpo. ExpectedStatus evita decisiones basadas
en una pantalla antigua. Estados obsoletos producen ORDER_STATE_CHANGED y saltos inválidos
ORDER_TRANSITION_INVALID (409). Repetir la última solicitud con mismo actor, origen, destino y nota
devuelve el resultado sin repetir efectos. Cambiar nota/actor o avanzar más estados no reproduce
una operación anterior. No existe reapertura ni ciclos de estados.

La transacción bloquea productos en orden de ID, tienda, categorías, usuarios y subpedido,
compatible con checkout y ajustes de producto. Revalida actividad/rol y propiedad antes de escribir.
Confirmar PENDING registra OUT y stockDeductedAt. Cancelar repone solo cantidades previamente
descontadas, registra IN y stockRestoredAt una única vez. Un pendiente sin descuento no genera IN.
Se preserva INACTIVE y no se reactivan productos moderados al devolver existencias.
Un desbordamiento del entero de stock revierte productos, movimiento, estado e historial completos.
Filas con marcas de inventario inconsistentes se rechazan, sin reparación silenciosa.

Historial y estado se escriben juntos. Las fechas del historial aumentan dentro del subpedido,
incluso si dos solicitudes coinciden en un milisegundo. Los detalles/listas usan RepeatableRead;
la recuperación de confirmación conserva su bloqueo de carrito y lectura posterior al bloqueo.
Un timeout/conflicto de transacción puede requerir comprobar el pedido (ORDER_STATE_BUSY).

## Importes y pantalla

Order.total, subtotales y snapshots no se reescriben por cancelación. activeProductsTotal calcula
en Decimal la suma histórica de partes no canceladas, sin envío. El recibo distingue el importe
original y los productos no cancelados. El pago permanece histórico: estas acciones no cobran,
marcan contra entrega como pagado, ni reembolsan dinero. SIMULATED continúa explícitamente de prueba.
Los estados mixtos se muestran por tienda; no se sobrescribe un estado global.

`/vendedor/pedidos` lista y filtra; `/vendedor/pedidos/:id` muestra entrega, líneas propias,
historial y próximos pasos permitidos. `/pedidos/:id` muestra historial por tienda y cancelación
temprana del cliente. Las acciones tienen revisión previa y mutex contra doble clic.
Tras conflicto o resultado incierto se exige consultar el estado antes de reenviar. No hay reintentos
automáticos de red. Cache por identidad/epoch, descarte al salir/cambiar sesión e invalidación de
pedidos, inventario, catálogo y métricas. No hay actualización en tiempo real: usar Actualizar.
Las respuestas de API anteriores siguen consultables sin habilitar acciones nuevas.

## Verificación

```powershell
npm run test:order-transitions
npm run test:orders
npm run test:checkout
npm run test:cart
npm run test:products
npm run test:seller-dashboard
npm run test:security
npm run test:api
npm run test:database
npm run test:frontend
npm run typecheck
npm run build:backend
npm run build:frontend
npm run check
```

Catorce pruebas nuevas de PostgreSQL/HTTP comprueban secuencia, permisos, aislamiento, snapshots,
cancelaciones concurrentes, carreras, restauración, moderación, rollback, PENDING y OpenAPI.
Interfaz, regresión y comprobación real se registrarán al cerrar la fase.
