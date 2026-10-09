# Productos — fase 9

ProductsModule importa DatabaseModule y SecurityModule. Todas las rutas `/api/v1/seller/products`
requieren Bearer JWT de un SELLER activo con sesión vigente. La tienda se obtiene de su identidad;
no se acepta businessId/ownerId del cuerpo o como filtros de lista.

| Método | Ruta                 | Resultado                              |
| ------ | -------------------- | -------------------------------------- |
| POST   | /seller/products     | 201; crea producto de la tienda propia |
| GET    | /seller/products     | Lista paginada de productos propios    |
| GET    | /seller/products/:id | Detalle propio por UUID                |
| PATCH  | /seller/products/:id | Actualización parcial                  |
| DELETE | /seller/products/:id | 204 si no tiene referencias de pedidos |

## Datos y reglas

POST exige categoryId (UUID activo), name (2–180), slug (3–220 ASCII con guiones simples),
description (texto plano, hasta 10000), price y sku (1–80, sensible a mayúsculas). Los textos se recortan;
slug se convierte a minúsculas. Price es texto decimal GTQ entre 0 y 9999999999.99, sin exponentes
y hasta dos decimales. Nunca se convierte a Number para persistir: la respuesta usa exactamente
dos decimales. Stock es entero JSON 0–2147483647, predeterminado 0; status predeterminado INACTIVE.
PATCH conserva los campos omitidos, rechaza null, propiedades adicionales y cuerpos vacíos.
mainImage e images no son editables en el DTO: corresponden al módulo de carga de imágenes.

PENDING permite preparar borradores INACTIVE; solo una tienda ACTIVE puede activar productos.
SUSPENDED/REJECTED permiten lectura pero rechazan escrituras con 403 BUSINESS_NOT_EDITABLE.
ACTIVE con stock=0 pasa a OUT_OF_STOCK; reponer stock de OUT_OF_STOCK lo devuelve a ACTIVE.
INACTIVE conserva ese estado al cambiar stock. OUT_OF_STOCK explícito con stock positivo devuelve
409 STOCK_STATUS_CONFLICT. La categoría debe estar activa al crear, cambiar categoría o mantener
un producto publicado; siempre se puede pasar a INACTIVE sin cambiar categoría.

Cada creación con stock positivo registra IN y cada cambio de stock registra ADJUSTMENT con
saldo previo/final y diferencia firmada. Bloqueos de fila serializan cambios del mismo producto;
producto y movimiento se confirman en la misma transacción. La confirmación de pedidos se implementa
en su fase y deberá conservar esta disciplina de bloqueo. No se reservan existencias aquí.

Slug es único globalmente y SKU por tienda. Colisiones concurrentes producen
409 PRODUCT_IDENTIFIER_UNAVAILABLE sin aplicar parcialmente una edición o su movimiento.
UUID inexistente y producto ajeno comparten 404 RESOURCE_NOT_FOUND; UUID inválido devuelve 400.
DELETE borra solo productos sin referencias de pedidos y elimina sus ajustes manuales; si hay
referencias históricas devuelve 409 PRODUCT_IN_USE y revierte toda la operación. El vendedor puede
desactivar un producto histórico. La aplicación no elimina pedidos ni sus movimientos.

## Lista y pruebas

La lista admite page (1–10000, predeterminado 1), limit (1–50, predeterminado 20), search (hasta 120,
nombre o SKU sin distinguir mayúsculas, %, _ y barra inversa literales), categoryId y status.
Orden createdAt descendente e id descendente; total y página comparten snapshot RepeatableRead.
Respuesta `{ success: true, data: [...], meta: { page, limit, total, totalPages } }`.
Todos los filtros conservan el ámbito de propietario en SQL. Sin tienda, la lista está vacía;
crear exige una tienda y devuelve 404 si falta. No se publica catálogo `/products` en esta fase.

```powershell
npm run db:up
npm run test:products
```

Las pruebas usan PostgreSQL real y eliminan únicamente sus fixtures. Comprueban CRUD, roles,
propiedad, precios decimales, categorías, estados, stock concurrente, unicidad, paginación,
borrado histórico y contratos OpenAPI.
