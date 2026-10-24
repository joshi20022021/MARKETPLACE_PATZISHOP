# Panel administrador — fase 17

El panel ADMIN conecta métricas globales y revisión de negocios. No concede rol ADMIN desde
registro público, no añade cuentas al seed y no modifica esquema ni dependencias.
La administración de usuarios, CRUD global de productos, interfaz de categorías, reportes y
edición administrativa de pedidos no forman parte de esta etapa del roadmap.

## Acceso y contratos

Todos los endpoints exigen ADMIN exacto, JWT, sesión y usuario activos, cuotas y no-store.
SELLER y CUSTOMER reciben 403. El servicio comprueba también el rol; las decisiones revalidan
actividad y rol del administrador dentro de la transacción. Nunca se devuelve hash, refresh token
ni correo privado del propietario; solo su nombre, rol y actividad junto a los datos del negocio.

| Método | Ruta                                  | Comportamiento                                          |
| ------ | ------------------------------------- | ------------------------------------------------------- |
| GET    | `/api/v1/admin/dashboard`             | Métricas globales coherentes en RepeatableRead          |
| GET    | `/api/v1/admin/businesses`            | Lista, búsqueda literal por nombre/slug y filtro status |
| GET    | `/api/v1/admin/businesses/:id`        | Detalle, responsable y allowedStatuses                  |
| PATCH  | `/api/v1/admin/businesses/:id/status` | status, expectedStatus y expectedUpdatedAt              |

La lista acepta page 1–10000 y limit 1–50, por defecto 1/12; búsqueda recortada de hasta 120.
Orden estable por createdAt/id descendentes, conteo/lista en RepeatableRead. Campos extra,
tipos incorrectos, IDs inválidos y parámetros repetidos se rechazan. ID inexistente produce 404.
expectedUpdatedAt debe ser el valor UTC con milisegundos recibido en updatedAt.

## Revisión comercial

| Estado actual | Próximos estados |
| ------------- | ---------------- |
| PENDING       | ACTIVE, REJECTED |
| ACTIVE        | SUSPENDED        |
| SUSPENDED     | ACTIVE           |
| REJECTED      | PENDING          |

ACTIVE exige propietario SELLER activo. Una tienda rechazada vuelve a revisión antes de aprobarse.
No hay borrado ni reaprobación silenciosa. Se bloquea la fila Business, luego los usuarios del
administrador y propietario en orden estable con FOR SHARE. No se adquieren bloqueos de producto
en orden inverso a checkout. La escritura mantiene estado/versión esperados y aumenta updatedAt.
Dos revisiones concurrentes permiten una decisión; la otra recibe BUSINESS_CHANGED (409).
Cambios inválidos producen BUSINESS_TRANSITION_INVALID y propietario no elegible
BUSINESS_OWNER_UNAVAILABLE. Una repetición de la escritura anterior exige consultar otra vez.

Suspender/rechazar oculta tienda y productos a través de los filtros comerciales existentes.
No cambia estado individual, stock, historial de pedidos ni pagos. Reactivar vuelve a exponer
solo productos que aún cumplan todas las reglas. Los borradores siguen inactivos.
Los pedidos existentes conservan el flujo de atención de fase 16.
Se conserva el estado actual y updatedAt; esta etapa no añade bitácora de decisiones ni motivos.

## Interpretación de métricas

- Usuarios: registrados, activos y conteos por rol (incluyen cuentas inactivas en su rol).
- Tiendas: conteos por estado guardado; ACTIVE no implica propietario elegible.
- Productos: total y publicados con el mismo predicado que catálogo/media (stock, categoría, tienda y propietario).
- Compras: cada Order una vez. Subpedidos: abiertos, entregados y cancelados, sin confundirlos con compras.
- Importes: suma Decimal de SellerOrder.subtotal no cancelados por método, formato decimal de dos cifras.
  Excluye partes canceladas incluso en compras mixtas; no suma Order.total por cada vendedor.
  Contra entrega no son cobros y SIMULATED no es dinero real. Sin envío ni rango temporal.

## Pantallas y recuperación

`/admin/dashboard` ofrece resumen y acceso a pendientes. `/admin/negocios` filtra y pagina;
`/admin/negocios/:id` presenta datos y revisión previa de una decisión permitida por la API.
No se cargan imágenes externas del negocio durante la revisión. Las acciones usan mutex, estado
esperado y versión. Ante fallo o conflicto se bloquea el envío hasta un GET correcto; no hay
reintentos automáticos de PATCH. El fallo de recarga conserva los datos anteriores y el bloqueo.
Caché por identidad/epoch, descarte al salir e invalidación de resumen, lista y catálogo.
Las consultas se actualizan manualmente; no hay notificaciones ni sincronización entre navegadores.

## Crear una cuenta administradora

Operación local del propietario con acceso a la conexión privada de PostgreSQL. No es un endpoint
HTTP ni una opción del registro público. `npm run admin:create` crea una cuenta nueva con bcrypt 12;
si el correo existe, falla sin cambiar contraseña, rol ni actividad de esa cuenta.
No se incluye ninguna credencial de ejemplo utilizable. Desde la raíz en PowerShell:

```powershell
$env:PATZISHOP_ADMIN_NAME = Read-Host 'Nombre del administrador'
$env:PATZISHOP_ADMIN_EMAIL = Read-Host 'Correo del administrador'
$adminSecret = Read-Host 'Contraseña (mínimo 12 caracteres, máximo 72 bytes)' -AsSecureString
try {
  $env:PATZISHOP_ADMIN_PASSWORD = [Net.NetworkCredential]::new('', $adminSecret).Password
  npm run admin:create
} finally {
  Remove-Item Env:PATZISHOP_ADMIN_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:PATZISHOP_ADMIN_NAME -ErrorAction SilentlyContinue
  Remove-Item Env:PATZISHOP_ADMIN_EMAIL -ErrorAction SilentlyContinue
  $adminSecret.Dispose()
}
```

Requiere dependencias, Prisma generado, migraciones y backend/.env preparado según [backend](backend.md).
No guardar contraseña en archivos, argumentos, capturas ni historial. Después, ingresar por
`/ingresar` y abrir Administración. La utilidad no imprime credenciales ni crea sesiones.

## Verificación

`npm run test:admin`: trece pruebas PostgreSQL/HTTP para roles, sesiones, aprovisionamiento,
métricas globales, precisión, filtros, privacidad, transiciones, concurrencia, versiones y visibilidad.
La integración frontend y comprobación de navegador se registrarán al cerrar la etapa.
