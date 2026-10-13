# Frontend React

La fase 10 incorpora portada responsive, registro de cliente/vendedor, login, cuenta y formulario
de la tienda propia. La fase 11 añade catálogo público, filtros, tiendas y galería de producto.
La fase 12 incorpora carrito persistente de cliente, selector de cantidad y agregado desde producto.
Checkout y dashboards completos corresponden a etapas posteriores.

## Desarrollo local

Desde la raíz, instala con `npm ci` y sigue [la preparación del backend](backend.md), incluyendo
PostgreSQL, variables privadas, generación de Prisma y migraciones. En terminales separadas:

```powershell
npm run dev:backend
npm run dev:frontend
```

Abre **http://localhost:5173**. Vite exige ese puerto y redirige `/api` a `http://127.0.0.1:3000`.
`VITE_API_URL` es `/api/v1` por defecto; no necesitas un `.env` de frontend para trabajar localmente.
La plantilla permite configurar una URL HTTP(S) terminada en `/api/v1`, sin credenciales, query ni hash.
Las variables `VITE_*` son públicas: nunca pongas secretos en ellas.

El backend debe permitir exactamente `http://localhost:5173` en `CORS_ORIGIN`. Usar otro hostname
o puerto requiere ajustar proxy/origen. La cookie HttpOnly de refresh viaja mediante el proxy;
todos los POST de autenticación incluyen `X-PatziShop-CSRF: 1`.

| Ruta                      | Acceso      | Comportamiento                             |
| ------------------------- | ----------- | ------------------------------------------ |
| `/`                       | Público     | Portada y enlaces de participación         |
| `/catalogo`               | Público     | Productos, filtros y páginas en la URL     |
| `/tiendas`                | Público     | Directorio con búsqueda y páginas          |
| `/tiendas/:slug`          | Público     | Contacto y catálogo del negocio            |
| `/productos/:slug`        | Público     | Detalle, precio y galería                  |
| `/carrito`                | CUSTOMER    | Cantidades, grupos y totales del servidor  |
| `/registro?tipo=vendedor` | Público     | Selección inicial de vendedor; nunca ADMIN |
| `/ingresar`               | Público     | Login, errores y retorno a cuenta/tienda   |
| `/cuenta`                 | Autenticado | Datos actuales de `GET /auth/me`           |
| `/cuenta/tienda`          | SELLER      | GET, POST o PATCH de `/seller/business`    |
| Otras                     | Público     | Página 404                                 |

La tienda nace PENDING. Solo un GET 404 se interpreta como ausencia de tienda; los fallos de red
y permisos muestran un error con reintento. El formulario permite nombre, slug, descripción,
contacto y enlaces opcionales de logo/portada. No envía ownerId ni estado. Los enlaces vacíos
se convierten en null; el servidor conserva la autoridad sobre propiedad y aprobación.

## Sesión y datos

- Zustand conserva access token y usuario únicamente en memoria; no hay persistencia en storage.
- Al abrir/recargar se intenta refresh una vez. StrictMode no duplica esta inicialización.
- Axios comparte una promesa de renovación por pestaña y reintenta un 401 como máximo una vez.
- Web Locks serializa refresh, login, registro y logout entre pestañas del mismo origen.
  Es necesario un navegador moderno y contexto seguro (HTTPS o localhost).
- BroadcastChannel comunica cambios de sesión y logout, sin publicar tokens ni contraseñas.
- Cada cambio de identidad invalida la caché de TanStack Query. Las respuestas privadas de una
  sesión anterior se descartan, incluso si llegan después del logout o de un nuevo login.
- Un fallo de red durante refresh se distingue de una sesión anónima y permite reintentar.
  Si logout falla, se informa y se conserva la cuenta hasta confirmar la respuesta del servidor.
- Zod valida entradas y respuestas; React Hook Form muestra errores asociados a los campos,
  limita dobles envíos y acepta contraseñas con el límite UTF-8 real de bcrypt (72 bytes).
- No se reintentan automáticamente escrituras ni errores 429; la interfaz muestra Retry-After
  cuando está disponible. La API mantiene sus propios límites, validación y RBAC.

La coordinación se limita a un mismo origen de frontend. No uses simultáneamente varias
aplicaciones/orígenes que compartan la cookie: no comparten Web Locks ni BroadcastChannel.
La aplicación bloquea autenticación en navegadores sin Web Locks.
Para una API con URL absoluta, frontend y API deben pertenecer al mismo sitio compatible con
SameSite=Strict. Un frontend en localhost y una API directa en 127.0.0.1 no cumplen esa condición;
usa el proxy predeterminado. No se relaja la cookie para permitir sitios externos.

## Comprobaciones y build

```powershell
npm run test:frontend
npm run build:frontend
npm run check
npm audit
```

El build primero verifica TypeScript estricto y produce `frontend/dist` (ignorado por Git).
`npm run preview:frontend` sirve el build en localhost:4173; para probar autenticación debes
configurar el backend con ese origen y conservar el proxy. Vite es una herramienta de desarrollo,
no el servidor definitivo de producción. El hosting futuro debe servir el SPA con fallback a
index.html, HTTPS y `/api` hacia NestJS; despliegue y contenedores completos siguen pendientes.

La interfaz usa tipografía del sistema, SVG propios y una paleta crema/verde/coral. Incluye
etiquetas, mensajes de estado, foco de navegación, enlace para saltar al contenido y movimiento reducido.

## Verificación de fase 10

24 pruebas Vitest cubren límites de registro/tienda, renovación simultánea, reintentos 401,
sesión vencida, descarte de respuestas antiguas, limpieza de caché, rutas por rol y formularios
con adaptadores Axios. La regresión de backend ejecutó 42 pruebas: 13 de auth, 15 de negocios y 14 de API.

En Brave con la API y PostgreSQL reales se comprobó registro de SELLER, creación PENDING,
edición, persistencia al recargar, recuperación por cookie, perfil, login y propagación de
login/logout entre dos pestañas. Se eliminaron únicamente la cuenta y tienda ficticias creadas
para esa comprobación. Los procesos HTTP de prueba se detienen al terminar.

La portada se inspeccionó visualmente en escritorio. Para el viewport móvil se comprobó el DOM
y ausencia de desbordamiento horizontal; las capturas posteriores fallaron por timeout de la
herramienta del navegador, por lo que no se presentan como revisión visual móvil completada.
No se guardaron credenciales ni capturas de cuentas en el repositorio.

Referencias oficiales: [Vite](https://vite.dev/guide/),
[React Router](https://reactrouter.com/start/declarative/installation),
[Tailwind con Vite](https://tailwindcss.com/docs/installation/using-vite) y
[proxy de preview](https://vite.dev/config/preview-options#preview-proxy).

## Verificación de fase 11

36 pruebas frontend correctas, incluidas 12 nuevas de contratos públicos, categorías paginadas,
transporte sin Bearer/refresh, filtros, galería, tienda, directorio y recuperación de errores.
Vitest ejecuta archivos secuencialmente para evitar múltiples entornos jsdom simultáneos.
Las rutas de marketplace, cuenta y tienda propia se cargan bajo demanda con Suspense.
Build y TypeScript estricto correctos; el paquete inicial queda por debajo del aviso de 500 kB de Vite.

Con Brave, NestJS y PostgreSQL se comprobaron filtros combinados, orden, segunda página,
navegación atrás, detalle, selección de imágenes reales, contacto y catálogo de tienda,
y búsqueda del directorio. Se usaron 14 productos, una tienda y una categoría temporales propios,
eliminados al terminar junto con su cuenta e imágenes; el seed permanece sin cambios.

Catálogo y detalle se revisaron visualmente en escritorio; el detalle también en móvil.
El DOM de catálogo y tienda no mostró desbordamiento horizontal en anchos móviles
(356 y 434 píxeles CSS respectivamente). Las capturas de catálogo y tienda móviles agotaron
el tiempo de la herramienta; no se declaran revisadas visualmente. El viewport se restauró.
Contratos, rutas y límites en [marketplace](marketplace.md).

## Verificación de fase 12

49 pruebas frontend correctas, incluidas 13 nuevas del carrito: contratos y cantidades,
acceso por sesión/rol, retorno desde login, dos tiendas, PATCH absoluto, eliminación,
líneas retiradas, stock reducido, agregado, conflictos, red y descarte tras logout.
API y build frontend correctos; paquete inicial de 488.37 kB sin el aviso de 500 kB.
La regresión backend verificó 82 pruebas: 12 carrito, 22 productos, 8 marketplace,
16 seguridad, 14 API y 10 restricciones SQL.

Brave con NestJS/PostgreSQL comprobó login desde el detalle y retorno, agregado de dos tiendas,
subtotales, edición, recarga por cookie, stock reducido, corrección, rechazo de exceso,
despublicación sin datos privados, eliminación, carrito vacío y logout.
El carrito se revisó visualmente en escritorio y móvil; DOM sin desbordamiento a 434 píxeles CSS.
Una captura de página completa agotó el tiempo de la herramienta; las capturas de viewport
sí permitieron revisar la interfaz. Se restauró el viewport al terminar.

Se eliminaron solo las fixtures propias (un cliente, dos vendedores, dos tiendas, categoría y productos),
incluidos carrito y sesiones por cascada. Los procesos HTTP temporales se detuvieron; no se
guardaron credenciales en Git. Contratos y límites en [carrito](cart.md).
