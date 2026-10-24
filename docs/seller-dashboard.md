# Panel del vendedor — fase 15

`GET /api/v1/seller/dashboard` exige SELLER, JWT/sesión y usuario activos. Obtiene la tienda
por ownerId de la identidad; ningún parámetro selecciona otra tienda. Responde no-store,
con cuotas existentes y contrato OpenAPI. Sin tienda devuelve business=null y contadores cero,
sin crear registros. La lectura conserva consistencia mediante RepeatableRead y consultas secuenciales.

## Métricas

- Productos totales y por estado ACTIVE, INACTIVE y OUT_OF_STOCK.
- Stock bajo: productos con 1–5 unidades, de cualquier estado.
- Subpedidos totales, en curso (PENDING/CONFIRMED/PREPARING/SHIPPED), entregados y cancelados.
- Importe histórico de subpedidos no cancelados contra entrega, separado de simulación.

Todos los datos corresponden al negocio propio y a toda su actividad, sin ventana temporal.
Los importes son sumas Decimal de SellerOrder.subtotal: no se usa el total de Order, que puede
contener otras tiendas. Se transportan como texto en GTQ y no incluyen envío ni representan cobros.
El importe simulado es únicamente de prueba. Activo es el estado del producto: categoría, tienda,
propietario y stock también condicionan su visibilidad pública.

## Interfaz

`/vendedor` presenta resumen y estado de tienda; `/vendedor/productos` lista, busca por nombre/SKU
y filtra por estado, con paginación en URL. `/vendedor/productos/nuevo` y
`/vendedor/productos/:id/editar` conectan el CRUD de [productos](products.md), sin duplicar reglas.
Los datos de negocio siguen en `/cuenta/tienda`, enlazados desde el panel.

La tienda PENDING prepara productos INACTIVE. SUSPENDED/REJECTED permite consulta y bloquea
ediciones. NestJS conserva el control efectivo de permisos, disponibilidad y propiedad.
Editar envía solo campos modificados: un cambio de nombre no sobrescribe stock con una lectura antigua.
El ajuste explícito de stock sigue siendo absoluto; una compra concurrente puede haber cambiado la
cantidad desde la lectura. Conviene cargar datos recientes antes de ajustar existencias.

Imágenes: una por solicitud multipart, hasta seis JPEG/PNG/WebP de 5 MiB. El servidor comprueba
formato real y normaliza WebP. Las vistas previas usan GET privado con Bearer y blobs temporales
liberados al salir; no se ponen tokens en URLs ni se depende de publicación pública para ver borradores.
Eliminar producto o imagen exige un segundo paso en la interfaz. Las referencias históricas impiden
borrar productos comprados; la alternativa es desactivar. Se conserva el esquema y el seed.

Las escrituras no se reintentan por red. Un fallo incierto bloquea reenvíos hasta consultar datos;
una creación incierta dirige al listado para comprobar si existe. Las respuestas privadas se acotan
a identidad/epoch y se descartan tras logout. No se añaden almacenamiento local ni dependencias.
Actualizar resumen consulta las métricas; no existe actualización en tiempo real.

La [gestión de estados de pedidos](order-management.md) está conectada desde fase 16;
el [panel ADMIN](admin-dashboard.md) está conectado desde fase 17.

## Comprobación

```powershell
npm run test:seller-dashboard
npm run test:products
npm run test:security
npm run test:api
npm run test:database
npm run test:frontend
npm run typecheck
npm run build:backend
npm run build:frontend
npm run check
```

Seis pruebas nuevas de API con PostgreSQL real verifican permisos, ausencia de tienda,
stock/estados, separación por propietario, importes decimales históricos, simulación, moderación
y OpenAPI. El frontend añade 17 pruebas del panel, CRUD, red, imágenes, roles y sesión.
Cierre: 120 pruebas backend y 92 frontend correctas; builds, TypeScript estricto y check correctos.
Brave/API/SQL verificaron login, filtros, creación, edición, persistencia y métricas actualizadas;
movimientos IN/ADJUSTMENT y vista previa privada de un borrador.
La extensión bloqueó seleccionar un archivo local: multipart se verificó por HTTP (201), sin cambiar
permisos del navegador. Panel, listado y formulario se revisaron visualmente en escritorio y móvil,
sin desbordamiento a 434 píxeles CSS; viewport restaurado. Fixtures, imágenes y procesos temporales
retirados. Más detalle en [frontend](frontend.md).
