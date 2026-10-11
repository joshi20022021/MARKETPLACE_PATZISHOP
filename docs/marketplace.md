# Marketplace público

La fase 11 añade consulta pública de productos, catálogo, filtros, directorio de tiendas,
página de tienda y detalle con galería. Carrito y checkout se implementarán en fases 12 y 13.

## API de productos

GET `/api/v1/products` devuelve `{ success: true, data, meta }`. GET
`/api/v1/products/:slug` devuelve un producto o 404. Ambos admiten invitados y conservan
los límites globales de solicitudes; las respuestas llevan Cache-Control: no-store.

Solo se publican productos ACTIVE con stock positivo, categoría activa, tienda ACTIVE y
propietario SELLER activo. Catálogo, detalle y archivos de imágenes comparten el mismo filtro.
No hay endpoints de aprobación nuevos ni cambios de esquema, seed o dependencias.

| Parámetro           | Contrato                                                             |
| ------------------- | -------------------------------------------------------------------- |
| page                | Entero 1–10000; predeterminado 1                                     |
| limit               | Entero 1–50; predeterminado 20                                       |
| search              | Nombre o descripción, máximo 120 caracteres; LIKE literal            |
| categoryId          | UUID opcional                                                        |
| businessSlug        | Slug canónico de tienda, máximo 160 caracteres                       |
| minPrice / maxPrice | Decimales inclusivos: hasta 10 enteros y 2 decimales, sin exponentes |
| sort                | newest (predeterminado), price-asc o price-desc                      |

Un mínimo superior al máximo devuelve 400 INVALID_PRICE_RANGE. Prisma Decimal compara y
filtra precios en PostgreSQL; las respuestas conservan cadenas con dos decimales. No se permite
filtrar estados privados ni propietario: campos extra, arreglos y límites inválidos se rechazan.
Conteo y datos comparten una transacción RepeatableRead. El orden incluye ID como desempate;
las páginas fuera de rango son vacías y conservan el total. La paginación offset puede desplazarse
entre solicitudes si cambian publicaciones o precios.

La proyección contiene id, nombre, slug, descripción, precio, mainImage, imágenes ordenadas,
categoría (id/nombre/slug) y tienda (id/nombre/slug/logo). No devuelve SKU, stock exacto, ownerId,
estado de moderación, movimientos ni fechas internas. Despublicado e inexistente comparten 404.

## Frontend

- `/catalogo`: búsqueda, categoría, rango de precios, orden y páginas en la URL.
- `/tiendas`: directorio paginado con búsqueda por nombre/descripción.
- `/tiendas/:slug`: identidad, contacto comercial y productos filtrados por esa tienda.
- `/productos/:slug`: precio en GTQ, descripción, galería y enlaces a categoría/tienda.

Axios público no adjunta Bearer ni renueva sesión por errores del catálogo. TanStack Query
usa claves por filtros/slug y AbortSignal; Zod comprueba respuestas y URLs de media.
Formularios aplican filtros al enviar y vuelven a la primera página. El botón atrás restaura
la URL. Rangos y enlaces inválidos se muestran sin enviar consultas inválidas. Las categorías
se leen por páginas de 50, incluyendo las que no caben en la primera página.

Errores 404, red, carga, resultados vacíos y páginas vacías tienen estados explícitos. Una imagen
ausente o fallida usa un placeholder SVG; no se inventan productos, precios, métricas ni tiendas.
La galería permite seleccionar imágenes con botones accesibles. No se muestra un botón de compra
antes de que exista el carrito. Los contactos de tienda son los publicados por el vendedor.

El servidor verifica visibilidad en cada lectura. Un navegador que ya abrió una página no recibe
actualizaciones en tiempo real; nuevas consultas/navegaciones comprueban el estado vigente.
Las URL relativas de media usan el proxy local; con API absoluta se resuelven sobre su origen.

## Verificación

```powershell
npm run test:marketplace
npm run test:products
npm run test:security
npm run test:frontend
npm run build:backend
npm run build:frontend
npm run check
```

La prueba de marketplace usa PostgreSQL real y elimina solo sus propias fixtures. Comprueba
publicación, proyección, filtros, precisión, orden, páginas, validación, cambio de slug y OpenAPI.
Preparación y arranque: [frontend](frontend.md), [backend](backend.md) y [base de datos](database.md).
