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
`test:products` ejecuta veintidós pruebas: diez CRUD y doce de imágenes. Estas últimas incluyen
archivos reales, orientación/EXIF, WebP animado y cargas concurrentes con limpieza compensatoria.
Se reprodujo npm ci, se regeneró Prisma y pasaron las 107 pruebas del proyecto. El build HTTP en
production comprobó CRUD, propiedad, decimales, multipart real, vista previa y media WebP pública,
transición por stock y eliminación de archivos. Sus cuentas, tienda, categoría, producto e imágenes
temporales se eliminaron; el proceso se detuvo al terminar.

## Prueba manual

Ejecuta `npm run dev:backend` y abre `http://127.0.0.1:3000/api/docs`. Registra una cuenta SELLER,
proporciona el accessToken a Authorize y crea su tienda con el flujo de [negocios](businesses.md).
Obtén un categoryId activo desde GET `/api/v1/categories` y crea un borrador:

```json
{
  "categoryId": "<UUID de categoría activa>",
  "name": "Bolso artesanal",
  "slug": "bolso-artesanal",
  "description": "Bolso tejido en Patzicía",
  "price": "125.50",
  "sku": "BOLSO-001",
  "stock": 5,
  "status": "INACTIVE"
}
```

Usa el id devuelto para GET/PATCH/DELETE y para POST images con un archivo JPEG/PNG/WebP.
La vista previa privada se consulta con Bearer. Una tienda recién creada sigue PENDING y no puede
activar productos; su aprobación administrativa corresponde a la fase 17. Las pruebas preparan
sus propias tiendas ACTIVE, sin añadir un atajo de aprobación ni datos de demostración al seed.

## Imágenes

ImageStorage es la abstracción de persistencia (save/read/remove); LocalImageStorage guarda archivos
en `backend/uploads/product-images` al ejecutar los scripts del workspace. No se publica ese directorio
mediante un servidor estático. Los archivos están excluidos de Git y deben conservarse con la BD.
Otro proveedor puede implementar la misma interfaz manteniendo las URL relativas de la API.

| Método | Ruta                                      | Resultado                                              |
| ------ | ----------------------------------------- | ------------------------------------------------------ |
| POST   | /seller/products/:id/images               | 201, producto actualizado; multipart con un campo file |
| DELETE | /seller/products/:id/images/:imageId      | 204, elimina imagen propia                             |
| GET    | /seller/products/:id/images/:imageId/file | WebP; vista previa autenticada del vendedor            |
| GET    | /media/products/:key                      | WebP público solo para producto y tienda elegibles     |

Hasta seis imágenes por producto; un archivo por solicitud, máximo 5 MiB. Se rechazan campos
multipart extra y archivos adicionales; exceso de bytes devuelve 413. Se verifica firma, decodificación
real y coincidencia con MIME JPEG/PNG/WebP. SVG, GIF, PDF y otros formatos reciben 415; imágenes
corruptas, animadas o de más de 16 millones de píxeles reciben 400 IMAGE_INVALID. No se aceptan
URL remotas ni nombres de archivo del cliente como rutas.

Sharp 0.35.5 orienta la imagen, limita su lado mayor a 2048 sin ampliar, elimina metadata y convierte
a WebP (calidad 82). El servidor genera UUID.webp; la respuesta incluye imágenes con id/url/position.
La primera es mainImage; al borrarla se promueve la siguiente, o queda null si no quedan imágenes.
Las posiciones conservan el orden de incorporación y pueden tener huecos tras borrar. Las cargas,
el borrado y los ajustes del mismo producto comparten bloqueos de fila: las cargas concurrentes
no superan seis imágenes ni duplican posiciones. Un exceso devuelve 409 IMAGE_LIMIT_REACHED.

Los borradores tienen vista previa privada. La ruta pública exige producto ACTIVE con stock positivo,
categoría activa, tienda ACTIVE y propietario SELLER activo. Un recurso no elegible, desconocido o con
archivo faltante devuelve 404. Las respuestas WebP son inline y no-store; las públicas permiten
su uso como imagen desde otros orígenes. La visibilidad se comprueba en cada solicitud, sin invalidar
bytes que alguien ya hubiera descargado. Los endpoints conservan las cuotas globales.

Si falla la vinculación a BD, se elimina el archivo nuevo. Al borrar una imagen o un producto,
primero se confirma la operación en BD y luego se limpian sus archivos. Un borrado rechazado por
historial no elimina archivos. Filesystem y PostgreSQL no comparten transacción: un cierre abrupto
o fallo de limpieza puede dejar archivos huérfanos; se registra la limpieza fallida sin exponer rutas
y esos archivos no se sirven sin su fila en BD. No se implementa todavía una tarea de reconciliación.

Referencias oficiales: [carga multipart en NestJS](https://docs.nestjs.com/techniques/file-upload)
y [opciones de decodificación de Sharp](https://sharp.pixelplumbing.com/api-constructor/).
