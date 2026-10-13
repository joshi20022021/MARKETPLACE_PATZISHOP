# Carrito — fase 12

Carrito persistente en PostgreSQL para CUSTOMER. No hay carrito anónimo, almacenamiento local,
checkout, pago ni creación de pedidos en esta etapa. Las tablas Cart y CartItem ya existían;
no se añaden migraciones, dependencias ni cuentas al seed.

## API

Todos los endpoints requieren Bearer, sesión vigente, usuario activo y rol CUSTOMER.
El propietario procede exclusivamente del JWT; los identificadores enviados no cambian su carrito.

| Método | Ruta                     | Entrada                              | Respuesta                                    |
| ------ | ------------------------ | ------------------------------------ | -------------------------------------------- |
| GET    | `/api/v1/cart`           | Ninguna                              | 200, carrito actual; no crea uno vacío       |
| POST   | `/api/v1/cart/items`     | productId UUID, quantity entero 1–99 | 201; agrega unidades a la línea existente    |
| PATCH  | `/api/v1/cart/items/:id` | quantity entero 1–99                 | 200; sustituye cantidad de una línea propia  |
| DELETE | `/api/v1/cart/items/:id` | Ninguna                              | 200; elimina línea propia y devuelve carrito |

Los cuerpos rechazan campos extra y no convierten cadenas en cantidades. IDs inválidos producen
400; línea inexistente o ajena comparte 404. SELLER y ADMIN reciben 403; sin sesión, 401.
GET lleva Cache-Control: no-store. Se conservan las cuotas globales y OpenAPI documenta contratos.

La respuesta contiene groups (business comercial o null, items, subtotal), itemCount (líneas),
quantityCount (unidades guardadas), subtotal, total y hasIssues. Cada línea contiene id, productId,
quantity, product comercial o null, available, maxQuantity, issue y lineTotal o null.
Precios y totales son cadenas decimales con dos dígitos; Prisma Decimal calcula en el servidor.
Total y subtotal coinciden: no incluyen envío, descuentos ni cargos de pago.

## Disponibilidad y concurrencia

- Hasta 50 productos distintos y 99 unidades por línea; se valida la cantidad acumulada contra stock.
- Se exige el mismo filtro que el catálogo: producto ACTIVE con stock positivo, categoría activa,
  tienda ACTIVE y propietario SELLER activo.
- 409 PRODUCT_UNAVAILABLE, INSUFFICIENT_STOCK, QUANTITY_LIMIT o CART_LIMIT informa el conflicto;
  la escritura fallida revierte la transacción y no cambia stock ni movimientos.
- Las operaciones del mismo cliente se serializan con un advisory lock transaccional de PostgreSQL.
  Agregar simultáneamente no pierde incrementos ni crea carritos o líneas duplicados.
- Agregar/editar toma un bloqueo compartido de producto al comprobar stock; inventario del vendedor
  no intercala una escritura sobre esa fila hasta terminar esa operación corta.
- Leer recalcula precios y disponibilidad. Stock reducido marca INSUFFICIENT_STOCK y conserva
  la cantidad para que el cliente la ajuste. Despublicación marca UNAVAILABLE y product=null,
  sin exponer datos privados de la tienda/producto; la línea sigue siendo eliminable.
- Los totales excluyen líneas con problemas; el resumen lo explica. Productos borrados desaparecen
  por la cascada ya existente. No se corrigen cantidades silenciosamente.

El carrito no reserva inventario ni garantiza precios. Otro cliente puede guardar el mismo stock;
el checkout futuro deberá validar de nuevo y la compra transaccional corresponde a la fase 14.
Una página abierta no recibe cambios en tiempo real: actualizar, recargar o volver al foco consulta el estado.
Los bloqueos del carrito no reemplazan la validación comercial ni los bloqueos de inventario de la compra.

## Frontend

`/carrito` exige sesión y muestra grupos por tienda, imágenes/placeholder, cantidad editable,
subtotales y total disponible. Permite quitar líneas retiradas, actualizar y recuperar errores.
El detalle público añade selector de cantidad y botón Agregar para CUSTOMER. Invitados pueden
ir a login y volver al producto; SELLER/ADMIN ven el límite de acceso. Login permite retornos
internos explícitos, nunca destinos externos.

Axios privado y TanStack Query usan claves por identidad y epoch; cambios de sesión limpian
caché y descartan respuestas anteriores. Mutaciones del carrito se serializan por cliente en la
pestaña y no se reintentan automáticamente ante fallos de red: un POST incierto puede haber
llegado al servidor, por lo que se invita a consultar el carrito antes de repetirlo.

## Comprobaciones

```powershell
npm run test:cart
npm run test:security
npm run test:api
npm run test:database
npm run test:frontend
npm run build:backend
npm run build:frontend
npm run check
```

Las pruebas usan fixtures propias y PostgreSQL real para cantidades, decimales, grupos,
propiedad, roles, disponibilidad, concurrencia, límites y contratos OpenAPI. Preparación y
arranque en [frontend](frontend.md) y [backend](backend.md).

Fase verificada: 82 pruebas backend y 49 frontend correctas; builds, TypeScript estricto y check correctos.
Brave/API/SQL comprobó agregado, dos tiendas, cantidades, persistencia, conflictos y eliminación.
Revisión de escritorio/móvil y limpieza de fixtures detalladas en [frontend](frontend.md).
