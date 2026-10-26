# Referencia de la API v1

Inventario contrastado con las 48 operaciones del OpenAPI generado por AppModule el 2026-10-26.
Los contratos de cada dominio enlazados abajo contienen DTO, límites, proyecciones y errores
específicos. Swagger muestra esos esquemas directamente desde los decoradores del código.

| Entorno        | Base de solicitudes                          | OpenAPI                                       |
| -------------- | -------------------------------------------- | --------------------------------------------- |
| Desarrollo     | http://127.0.0.1:3000/api/v1                 | /api/docs y /api/docs-json                    |
| Navegador Vite | http://localhost:5173/api/v1 mediante proxy  | Consultar la API de desarrollo                |
| Stack local    | https://localhost:8443/api/v1 mediante Caddy | Deshabilitado por configuración de producción |

No activar Swagger de producción para poder usar la aplicación. Para inspeccionar contratos,
usar desarrollo con SWAGGER_ENABLED=true. Los POST auth desde Swagger se rechazan si su Origin
no coincide con CORS_ORIGIN; obtener el JWT desde el frontend configurado o consola según
[autenticación](auth.md), después usar Authorize para consultas Bearer.

## Convenciones

- Bearer JWT obligatorio en rutas privadas, usuario y familia de sesión activos en BD.
  ADMIN no hereda permisos de SELLER ni CUSTOMER. El registro admite solo CUSTOMER/SELLER.
- Los cuatro POST auth son públicos respecto al JWT, pero exigen X-PatziShop-CSRF: 1 y validación
  de Origin. Refresh/logout usan la cookie HttpOnly; refresh no devuelve su valor en el JSON.
- POST/PATCH/PUT con cuerpo requieren application/json, salvo la carga multipart de una imagen.
  JSON máximo 32 KiB, sin compresión; imagen hasta 5 MiB. No enviar campos extra.
- UUID para identificadores y claves de intento; slug en los detalles públicos. No usar un ID
  suministrado por el cliente como autorización de propietario.
- Importes decimales se representan sin perder centavos; el servidor calcula totales. No enviar
  precios, propietario, estado de pago ni totales para autorizar una compra.
- Cada listado documenta filtros, límites y respuesta. No asumir que todos comparten defaults.
  page/limit de pedidos usan dígitos decimales: signos, fracciones y duplicados devuelven 400.
- API no-store, incluidos errores. CORS no sustituye autenticación ni permisos. Respetar
  Retry-After al recibir 429. En el stack local las cuotas de IP se comparten tras el proxy.

Consulta pública desde PowerShell, sin crear datos:

```powershell
Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/health/ready'
Invoke-RestMethod 'http://127.0.0.1:3000/api/v1/products?page=1&limit=12'
```

## Inventario de operaciones

Las rutas incluyen el prefijo real /api/v1. «Público» no elimina controles de visibilidad,
cuotas, origen de auth o límites de cuerpos. No existen endpoints públicos de aprovisionamiento ADMIN.

<!-- operations:start -->

| Metodo | Ruta                                                 | Acceso      |
| ------ | ---------------------------------------------------- | ----------- |
| GET    | `/api/v1/admin/businesses`                           | ADMIN       |
| GET    | `/api/v1/admin/businesses/{id}`                      | ADMIN       |
| PATCH  | `/api/v1/admin/businesses/{id}/status`               | ADMIN       |
| GET    | `/api/v1/admin/categories`                           | ADMIN       |
| POST   | `/api/v1/admin/categories`                           | ADMIN       |
| GET    | `/api/v1/admin/categories/{id}`                      | ADMIN       |
| PATCH  | `/api/v1/admin/categories/{id}`                      | ADMIN       |
| GET    | `/api/v1/admin/dashboard`                            | ADMIN       |
| POST   | `/api/v1/auth/login`                                 | Público     |
| POST   | `/api/v1/auth/logout`                                | Público     |
| GET    | `/api/v1/auth/me`                                    | Autenticado |
| POST   | `/api/v1/auth/refresh`                               | Público     |
| POST   | `/api/v1/auth/register`                              | Público     |
| GET    | `/api/v1/businesses`                                 | Público     |
| GET    | `/api/v1/businesses/{slug}`                          | Público     |
| GET    | `/api/v1/cart`                                       | CUSTOMER    |
| POST   | `/api/v1/cart/items`                                 | CUSTOMER    |
| DELETE | `/api/v1/cart/items/{id}`                            | CUSTOMER    |
| PATCH  | `/api/v1/cart/items/{id}`                            | CUSTOMER    |
| GET    | `/api/v1/categories`                                 | Público     |
| GET    | `/api/v1/categories/{slug}`                          | Público     |
| GET    | `/api/v1/checkout/options`                           | CUSTOMER    |
| POST   | `/api/v1/checkout/preview`                           | CUSTOMER    |
| GET    | `/api/v1/health`                                     | Público     |
| GET    | `/api/v1/health/ready`                               | Público     |
| GET    | `/api/v1/media/products/{key}`                       | Público     |
| GET    | `/api/v1/orders`                                     | CUSTOMER    |
| POST   | `/api/v1/orders`                                     | CUSTOMER    |
| GET    | `/api/v1/orders/{id}`                                | CUSTOMER    |
| GET    | `/api/v1/orders/confirmation/{key}`                  | CUSTOMER    |
| PATCH  | `/api/v1/orders/seller-orders/{id}/cancel`           | CUSTOMER    |
| GET    | `/api/v1/products`                                   | Público     |
| GET    | `/api/v1/products/{slug}`                            | Público     |
| GET    | `/api/v1/seller/business`                            | SELLER      |
| PATCH  | `/api/v1/seller/business`                            | SELLER      |
| POST   | `/api/v1/seller/business`                            | SELLER      |
| GET    | `/api/v1/seller/dashboard`                           | SELLER      |
| GET    | `/api/v1/seller/orders`                              | SELLER      |
| GET    | `/api/v1/seller/orders/{id}`                         | SELLER      |
| PATCH  | `/api/v1/seller/orders/{id}/status`                  | SELLER      |
| GET    | `/api/v1/seller/products`                            | SELLER      |
| POST   | `/api/v1/seller/products`                            | SELLER      |
| DELETE | `/api/v1/seller/products/{id}`                       | SELLER      |
| GET    | `/api/v1/seller/products/{id}`                       | SELLER      |
| PATCH  | `/api/v1/seller/products/{id}`                       | SELLER      |
| POST   | `/api/v1/seller/products/{id}/images`                | SELLER      |
| DELETE | `/api/v1/seller/products/{id}/images/{imageId}`      | SELLER      |
| GET    | `/api/v1/seller/products/{id}/images/{imageId}/file` | SELLER      |

<!-- operations:end -->

## Contratos por dominio

| Dominio                                           | Guía                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| Sesión, registro, cookie, refresh y logout        | [Autenticación](auth.md)                                          |
| Roles, propiedad, cuerpos y cuotas                | [Seguridad](security.md), [revisión integral](security-review.md) |
| Tienda propia y directorio público                | [Negocios](businesses.md)                                         |
| Categorías ADMIN y consulta pública               | [Categorías](categories.md)                                       |
| Productos, stock e imágenes privadas              | [Productos](products.md)                                          |
| Filtros, detalle y media comercial elegible       | [Marketplace](marketplace.md)                                     |
| Cantidades, disponibilidad y totales por tienda   | [Carrito](cart.md)                                                |
| Entrega, métodos y revisión sin efectos de compra | [Checkout](checkout.md)                                           |
| Confirmación, idempotencia, recibo e inventario   | [Pedidos](orders.md)                                              |
| Estados, cancelación, historial y restitución     | [Gestión de pedidos](order-management.md)                         |
| Métricas del negocio autenticado                  | [Panel vendedor](seller-dashboard.md)                             |
| Métricas globales y revisión comercial            | [Administración](admin-dashboard.md)                              |

## Errores y concurrencia

El contrato de error contiene success=false, statusCode, message, error, path sin query y timestamp.
No contiene stack, tokens ni cuerpos enviados. Un recurso ajeno se comporta como inexistente.

| HTTP    | Interpretación habitual                                          |
| ------- | ---------------------------------------------------------------- |
| 400     | DTO, UUID, filtros o JSON inválidos                              |
| 401     | Bearer ausente, vencido o sesión inválida                        |
| 403     | Rol u origen/cabecera auth no permitidos                         |
| 404     | Ruta o recurso inexistente/no accesible dentro del ámbito        |
| 409     | Conflicto de estado, versión, unicidad, disponibilidad o intento |
| 413     | Cuerpo o archivo excesivo                                        |
| 415     | Tipo o codificación de cuerpo no admitidos                       |
| 429     | Cuota excedida; respetar Retry-After                             |
| 500/503 | Error interno genérico o dependencia no disponible               |

Antes de cambiar estado de tienda usar expectedStatus y expectedUpdatedAt obtenidos de una
lectura reciente. Las transiciones de subpedido usan expectedStatus. Una confirmación de compra
usa reviewVersion e idempotencyKey: conservar la clave al recuperar una respuesta perdida,
consultar /orders/confirmation/:key y no reenviar automáticamente otra compra.
Detalles de cada conflicto y recuperación están en sus guías de dominio y pruebas.
