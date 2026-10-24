# Registro de cambios

Este archivo resume cambios reales; Git conserva el detalle de cada unidad de trabajo.
Los avances se documentan y guardan en commits coherentes durante el desarrollo, sin esperar
al cierre de una fase completa.

## 2026-10-24 — Revisión integral de validaciones y seguridad (fase 18)

- Origin de auth limitado a CORS_ORIGIN, sin derivar confianza de Host/Forwarded.
- No-store central bajo /api/v1, incluidos rechazos previos al controller; JSON estricto y compresión no admitida.
- Paginación de pedidos decimal estricta y rechazo de role null en registro.
- Nueve pruebas nuevas de frontera HTTP, matriz de rutas privadas y verificación aislada sin residuos.
- Parches Multer/body-parser/fast-uri/Vitest y peer DOM explícito; audit incorporado al workflow.
- Matriz de revisión, avisos y límites en docs/security-review.md; 323 pruebas aprobadas y conteos de 13 tablas conservados.
- Instalación limpia, check, tipos y ambos builds correctos; validación remota en curso.

## 2026-10-24 - Parches de dependencias y auditoria continua

- Multer 2.5.0, body-parser 2.4.0, fast-uri 3.1.9 y Vitest 4.1.12; peer DOM de pruebas declarado.
- Lockfile reproducible con peers compatibles; npm ci, tipos, check y ambos builds correctos.
- npm run audit:security incorporado a CI; cero vulnerabilidades reportadas.

## 2026-10-23 — Consolidación de testing (fase 19)

- Runner completo y comandos de unitarias, backend y recorridos HTTP, con compilación única y ejecución secuencial.
- Base local patzishop_test separada, migraciones explícitas y comprobación de limpieza sin reset.
- Seis pruebas unitarias nuevas para pagos/estados y guarda del destino de pruebas sin revelar credenciales.
- Guía reproducible en docs/testing.md. La fase 18 continúa pendiente por elección de orden del propietario.
- Dos recorridos HTTP multi-tienda correctos con ambos pagos, sesiones reales, aislamiento, entrega y cancelación parcial.
- 314 pruebas locales correctas: 193 backend, 120 frontend y una guarda del runner. Conteos de 13 tablas conservados.
- Builds y check correctos; GitHub Actions completó instalación limpia, migraciones, suite y builds con success (run 40065957144).
- Documentación y README actualizados; fase 19 completada, fase 18 pendiente. test.py conservado sin cambios.

## 2026-10-23 — Dashboard administrador

- Métricas ADMIN globales, compras/subpedidos diferenciados e importes no cancelados por método.
- Consulta paginada y revisión de tiendas con estado/versión esperados y bloqueo transaccional.
- Aprobación solo de vendedor activo; suspensión aplicada mediante filtros comerciales existentes.
- Aprovisionamiento local de cuentas nuevas ADMIN sin credenciales seed ni cambios de cuentas existentes.
- Trece pruebas nuevas de PostgreSQL/HTTP correctas; regresión backend de 168 pruebas correcta.
- Panel React ADMIN, lista con filtros y detalle con revisión previa y recuperación tras fallos.
- Trece pruebas frontend nuevas correctas; 120 en total. Flujo Brave/API/SQL comprobado en escritorio/móvil.
- Aprobación, suspensión, reactivación y visibilidad pública comprobadas; stock y movimientos conservados.
- Builds, TypeScript estricto y check correctos. Sesión cerrada, fixtures y procesos propios retirados.
- README y guías actualizados; siguiente fase 18, validaciones y seguridad, por petición.
- Contratos y operación en docs/admin-dashboard.md; sin migraciones ni nuevas dependencias.

## 2026-10-21 — Gestión de pedidos

- Transiciones SELLER y cancelación temprana CUSTOMER por subpedido, con estado esperado e historial.
- Reposición transaccional única con movimientos IN, preservación de moderación y rollback de errores.
- Confirmación segura de pendientes previos; historial público sin IDs de actores y filtro por estado.
- Total original conservado y cálculo Decimal de productos no cancelados; pago histórico sin cobros/reembolsos.
- Listado SELLER con filtro por estado, detalle, acciones revisables e historial; cancelación CUSTOMER por tienda.
- Bloqueo de reenvíos tras conflicto/respuesta incierta, recarga recuperable y descarte al cambiar sesión.
- Catorce pruebas nuevas de PostgreSQL/HTTP y quince de frontend; 134 backend y 107 frontend correctas.
- Builds, TypeScript estricto y check correctos; sin cambios de esquema, seed ni dependencias.
- Brave/API/SQL: avance hasta entrega, cancelación del vendedor y cancelación parcial del cliente comprobados.
- Historial, pago/total originales y reposición exacta verificados; revisión de escritorio/móvil sin desbordamiento.
- Fixtures y procesos propios retirados; sesión cerrada y override de viewport restaurado.
- Siguiente: fase 17, dashboard administrador, por petición.
- Contratos, reglas de actores y límites en docs/order-management.md.

## 2026-10-20 — Panel del vendedor

- Endpoint SELLER de métricas propias con lectura coherente y respuestas no-store.
- Conteos de producto/stock y subpedidos; importes históricos propios contra entrega y simulados separados.
- Seis pruebas nuevas correctas con PostgreSQL real: roles, aislamiento, vacíos, decimales y moderación.
- Panel /vendedor, listado/filtros paginados y formularios de producto conectados al CRUD existente.
- PATCH solo envía campos editados; carga multipart y vista previa privada mediante blobs temporales.
- Segundo paso para eliminar, explicación de historial, bloqueo de reenvíos inciertos y descarte al salir/cambiar sesión.
- Diecisiete pruebas frontend nuevas; 92 correctas en total. Regresión backend: 120 pruebas correctas.
- Brave/API/SQL: login con retorno, aislamiento, filtros, creación, precio/stock/estado, recarga y métricas actualizadas.
- Carga real HTTP 201 y vista privada de borrador comprobadas; selección por navegador bloqueada por permiso de la extensión.
- Panel, listado y formulario revisados visualmente en escritorio/móvil, sin desbordamiento a 434 píxeles CSS.
- Builds, TypeScript estricto y check correctos; sin cambios de esquema, seed ni dependencias.
- Fixtures propias, imágenes y procesos retirados; viewport restaurado. Guías y README actualizados.
- Siguiente: fase 16, gestión de pedidos, por petición. Contratos y límites en docs/seller-dashboard.md.

## 2026-10-18 — Pedidos multi-vendedor

- Migración compatible de idempotencia por cliente y huella de revisión de entrega/productos.
- Confirmación atómica: pedido, subpedidos CONFIRMED, snapshots, historial y descuento con movimientos OUT.
- Bloqueos estables de inventario, validación comercial actual, rollback y protección contra doble envío.
- Consulta propia CUSTOMER y subpedidos SELLER sin importes/líneas ajenos; recuperación por intento.
- Catorce pruebas nuevas correctas de pedidos con PostgreSQL real; regresión backend correcta.
- Checkout permite confirmar; recibo e historial propios en /pedidos y /pedidos/:id.
- UUID de intento en sessionStorage sin entrega/tokens; recuperación por GET tras resultados inciertos.
- Doce pruebas frontend nuevas: 75 correctas en total, incluidos doble envío, recuperación y logout.
- Brave/API/SQL verificaron dos compras ficticias, contra entrega y simulación, recarga e historial,
  cuatro subpedidos, cuatro salidas exactas, stock agotado y carrito vacío.
- Confirmación y recibo revisados visualmente en móvil sin desbordamiento a 434 píxeles CSS;
  recibo revisado en escritorio. Capturas de historial móvil fallaron por timeout; viewport restaurado.
- Cierre: 174 pruebas correctas (99 backend y 75 frontend), builds, TypeScript y check correctos.
- Migración aplicada; seed y dependencias sin cambios. Fixtures propias y procesos temporales retirados.
- README y guías actualizados; siguiente fase 15 (Dashboard vendedor), por petición.

## 2026-10-18 — Preparación de checkout

- CheckoutModule CUSTOMER: opciones y revisión de entrega con DTOs anidados y respuestas no-store.
- PaymentService desacopla contra entrega y simulación; ambos permanecen pendientes sin cobros ni tarjetas.
- Relectura del carrito propio, precios Decimal y bloqueo de vacío/disponibilidad inválida.
- Once pruebas nuevas correctas con PostgreSQL real; regresión de carrito, seguridad, API y SQL correcta.
- Contratos y límites documentados en docs/checkout.md.
- Ruta /checkout CUSTOMER conectada al carrito, formulario de entrega y opciones de pago del servidor.
- Resumen efímero por tienda; editar campos o cambiar el carrito retira la revisión anterior.
- Dirección fuera de caché/storage/URL; cancelación al salir y descarte de respuestas tras cambios de identidad.
- Catorce pruebas frontend nuevas correctas; 63 en total, build y check correctos.
- Brave/API/SQL: login con retorno, validación, ambos métodos, cambio de precio/stock, recuperación y descarte de dirección comprobados.
- Escritorio revisado visualmente; móvil sin desbordamiento por DOM a 434 píxeles CSS.
  Sus capturas agotaron el tiempo de la herramienta y no se declaran revisadas visualmente; viewport restaurado.
- Cierre: 126 pruebas correctas (63 backend y 63 frontend), builds, TypeScript estricto y check correctos.
- Fixtures propias y procesos temporales retirados. Esquema, seed y dependencias sin cambios.
- README y guías alineados con FASE 13 completada. Siguiente etapa: Órdenes multi-vendedor (fase 14), por petición.

## 2026-10-13 — Carrito

- CartsModule protegido para CUSTOMER: consulta, agregado incremental, cantidad absoluta y eliminación propia.
- Persistencia con tablas existentes, grupos por tienda y totales Decimal sin reservar inventario.
- Bloqueo por cliente, validación de stock y límites; líneas retiradas conservan eliminación sin datos privados.
- Doce pruebas API correctas con PostgreSQL real, incluidas propiedad, concurrencia, moderación y OpenAPI.
- Contratos y alcance documentados en docs/cart.md.
- Página /carrito con edición, eliminación, grupos por tienda, totales y estados explícitos.
- Detalle permite agregar cantidades; login vuelve al producto o carrito con destinos internos acotados.
- Caché por identidad/epoch, mutaciones serializadas y mensajes para stock, límites y escrituras inciertas.
- Trece pruebas frontend nuevas correctas; 49 en total, build y check correctos.
- Navegador/API/SQL: dos tiendas, edición, recarga, stock reducido, corrección, rechazo real y eliminación verificados.
- Carrito revisado visualmente en escritorio y móvil, sin desbordamiento horizontal en 434 píxeles CSS.
- Regresión correcta: 82 pruebas backend y 49 frontend; builds, TypeScript estricto y check correctos.
- Fixtures propias retiradas y procesos HTTP detenidos. Seed, esquema y dependencias sin cambios.
- README y guías actualizados: FASE 12 completada. Próxima etapa: Checkout (fase 13), por petición.

## 2026-10-11 — Catálogo público

- GET público de productos y detalle por slug con proyección comercial explícita y precios decimales.
- Filtros por búsqueda, categoría, tienda y rango de precios; orden estable y páginas acotadas.
- Catálogo y media comparten publicación: producto disponible, categoría activa y tienda/propietario válidos.
- Ocho pruebas nuevas correctas con PostgreSQL real; TypeScript y build backend correctos.
- Contratos, rutas y límites documentados en docs/marketplace.md.
- Conteo y lectura del catálogo se ejecutan secuencialmente dentro de RepeatableRead.
- La regresión de seguridad reconoce el nuevo GET público y conserva el rechazo de filtros privilegiados.
- Regresión correcta: 16 pruebas de seguridad, 14 de API y 10 de restricciones SQL; build backend correcto.
- Catálogo React con búsqueda, categorías, precios, orden y paginación reproducibles en la URL.
- Directorio y tienda pública con contacto; detalle de producto con galería, precios GTQ y estados de error/vacío.
- Transporte público sin Bearer ni renovación de sesión; respuestas Zod, cancelación y placeholders seguros.
- Doce pruebas frontend nuevas; 36 correctas en total. Rutas cargadas bajo demanda y build correcto.
- Brave/API/SQL: filtros, páginas, navegación, galería, tienda y búsqueda de negocios comprobados.
- Catálogo/detalle revisados visualmente en escritorio; detalle también en móvil. Catálogo/tienda móvil
  sin desbordamiento por DOM; sus capturas agotaron el tiempo de la herramienta y no se declaran revisadas visualmente.
- Fixtures propias retiradas: cuenta, tienda, categoría, 14 productos y dos imágenes. Seed y dependencias sin cambios.
- Cierre de fase: 70 pruebas backend y 36 frontend correctas; builds, check y audit sin vulnerabilidades.
- README, roadmap y guías alineados con FASE 11 completada. Siguiente etapa: Carrito (fase 12), por petición.

## 2026-10-11 — Base React, sesión y formularios

- Frontend con React 19, Vite 7, Router 7, Tailwind 4 y TypeScript estricto; scripts desde la raíz.
- Portada responsive con identidad local, rutas 404, navegación y formularios accesibles.
- Axios, TanStack Query, Zustand, React Hook Form y Zod conectan registro, login, cuenta y tienda propia.
- Access token en memoria, renovación compartida, Web Locks entre pestañas y descarte de respuestas antiguas.
- Cookie HttpOnly vía proxy, CSRF, invalidación de caché y logout confirmado por el servidor.
- Vitest 4.1.11 corrige los avisos de seguridad de la línea 3; npm audit sin vulnerabilidades.
- 23 pruebas frontend correctas: contratos, sesión, reintentos, rutas, registro y creación/edición de tienda.
- Build con TypeScript estricto correcto; guía de uso y límites en docs/frontend.md.
- Guía inicial de ejecución y límites; el cierre documental se completa tras verificar el navegador.
- Corrección de recuperación: un refresh 401 conduce a login al reintentar y un segundo 401
  tras renovar limpia la sesión sin bucles. 24 pruebas frontend correctas, incluida esta regresión.
- Regresión del backend: 42 pruebas correctas (13 auth, 15 negocios y 14 API), sin cambios de esquema.
- Brave/API/PostgreSQL: registro, tienda PENDING, edición, recarga, perfil, login y logout entre pestañas correctos.
- Solo las fixtures propias se eliminaron. Portada revisada en escritorio y ancho móvil comprobado por DOM;
  las capturas móviles fallaron por timeout de la herramienta y no se declaran verificadas visualmente.
- README, arquitectura, tecnologías, contribución y roadmap alineados con las rutas implementadas.
- Instalación reproducida con npm ci/npm 10.9.3; audit sin vulnerabilidades y build frontend correcto.
- FASE 10 completada. Siguiente etapa: Marketplace público (fase 11), únicamente por petición.

## 2026-10-08 — Productos del vendedor

- ProductsModule con CRUD propio, DTOs estrictos, precio decimal textual y lista paginada con filtros.
- Estados coherentes con stock, categoría activa y aprobación de la tienda; suspensión bloquea escrituras.
- Movimientos de stock transaccionales con bloqueos de fila y conflictos de slug/SKU seguros.
- Borrado restringido por referencias históricas y guía de contratos en docs/products.md.
- Diez pruebas CRUD correctas con PostgreSQL real; regresión de API/seguridad, typecheck y build correctos.
- ImageStorage desacoplado y almacenamiento local, carga JPEG/PNG/WebP con normalización Sharp 0.35.5.
- Máximo 5 MiB/archivo, seis imágenes/producto, límite de píxeles y rechazo de contenido corrupto o animado.
- Vista previa propia, media pública condicionada por producto/tienda/categoría/propietario y limpieza compensatoria.
- Veintidós pruebas de productos correctas: diez CRUD y doce imágenes, con redimensionado/EXIF y animación reales.
- Build, TypeScript estricto, lint y formato correctos con la integración de almacenamiento.
- npm ci reproducido, cliente Prisma regenerado y regresión completa correcta: 107 pruebas.
- Cobertura: 22 productos/imágenes, 17 categorías, 15 negocios, 16 seguridad, 14 API, 13 auth y 10 SQL.
- Build HTTP en production: CRUD, propiedad, precio decimal, multipart real, WebP privado/público, stock y limpieza correctos.
- Fixtures y archivos temporales eliminados y proceso detenido; Prisma válido, migraciones al día y npm audit sin vulnerabilidades.
- README, guías y roadmap actualizados; FASE 9 completada. Siguiente etapa: Frontend React.

## 2026-10-08 — Categorías globales

- CategoriesModule con creación, lista, detalle y edición administrativa limitada a ADMIN.
- Categorías planas, DTOs estrictos, activación reversible y conflictos de slug seguros bajo concurrencia.
- Desactivación que conserva referencias; no se publica eliminación ni gestión de subcategorías.
- Guía inicial en docs/categories.md y pruebas reales de permisos, validación y persistencia.
- Nueve pruebas administrativas correctas; regresión de catorce pruebas API y dieciséis de seguridad correcta.
- Typecheck y build correctos, usando el esquema y las dependencias existentes.
- Consulta pública de categorías activas, paginación y búsqueda literal con proyección explícita.
- Seed que crea slugs base faltantes y conserva todos los datos administrados de categorías existentes.
- Diecisiete pruebas de categorías correctas, incluidas consulta pública, OpenAPI y seed repetible.
- Typecheck, build y npm run check correctos tras integrar las consultas públicas.
- Regresión completa correcta: 85 pruebas (17 categorías, 15 negocios, 16 seguridad, 14 API, 13 auth y 10 SQL).
- Prisma válido y migraciones al día; seed CLI repetido dos veces y npm audit sin vulnerabilidades reportadas.
- Build HTTP en production: permisos ADMIN, creación/consulta/desactivación, listas filtradas y visibilidad pública correctos.
- Fixtures eliminadas y proceso detenido; README, roadmap y guías actualizados al estado real.
- FASE 8 completada; siguiente etapa: CRUD de productos. Subcategorías y pantallas siguen pendientes.

## 2026-10-08 — Gestión de negocios

- BusinessesModule con creación, consulta y edición de la única tienda del vendedor.
- Identidad y propiedad desde JWT, estado PENDING fijo y rechazo de campos privilegiados.
- DTOs con edición parcial, validación de slug/contacto y URL de logo/banner anulables.
- Restricciones únicas de propietario y slug con conflictos 409 seguros incluso bajo concurrencia.
- Ocho pruebas con PostgreSQL real correctas; regresión de API/seguridad, typecheck y build correctos.
- Contratos y decisiones en docs/businesses.md; no se cambian dependencias, entorno ni migraciones.
- Consulta pública de tiendas ACTIVE con propietario SELLER activo, lista paginada y detalle por slug.
- Proyección pública sin datos del propietario, búsqueda literal y snapshot coherente de total/resultados.
- Siete pruebas públicas adicionales: quince pruebas de negocios correctas y regresión de seguridad correcta.
- Regresión completa: 68 pruebas correctas (15 negocios, 16 seguridad, 14 API, 13 auth y 10 SQL).
- Typecheck, build, validación Prisma y estado de migraciones correctos; npm audit sin vulnerabilidades reportadas.
- README, arquitectura, guías técnicas y roadmap actualizados al alcance real de la fase 7.
- Build HTTP en production comprobado: registro SELLER, creación/lectura/edición, visibilidad pública y Swagger oculto.
- Cuenta y tienda temporales eliminadas, proceso detenido y npm run check correcto antes de publicar.
- FASE 7 completada; aprobación administrativa y página visual reservadas para las fases 17 y 11.

## 2026-10-08 — RBAC y controles de propiedad

- JwtAuthGuard global: rutas protegidas por defecto y excepciones Public explícitas.
- RolesGuard global y Roles con permisos exactos por método/controller, sin privilegios implícitos de ADMIN.
- SecurityModule con filtros Prisma de propiedad para tiendas, productos, subpedidos, pedidos y direcciones.
- Diez pruebas de seguridad con PostgreSQL real: matriz de roles, aislamiento, datos manipulados y escrituras acotadas.
- Guía de integración para futuros módulos en docs/security.md; no se añaden endpoints comerciales.
- Throttler 6.7.1 con cuotas por IP/handler: API 120/minuto, registro 5, login 10, refresh/logout 30.
- Guard de cuota previo a JWT/roles, 429 consistente con Retry-After y encabezados accesibles por CORS.
- JSON limitado a 32 KiB con errores seguros; salud exenta y storage en memoria por proceso.
- Seis pruebas adicionales de cuotas, bloqueo, IP falsificada, JSON, CORS y OpenAPI: dieciséis de seguridad.
- Regresión completa correcta: catorce pruebas API/entorno, trece auth y diez SQL, más build y typecheck.
- npm ci reproducido, cliente regenerado y dieciséis pruebas de seguridad correctas tras reinstalar.
- Build HTTP en production: 401, 429/Retry-After, 413, salud disponible, Swagger oculto y probes ausentes.
- Fixtures eliminadas; npm run check correcto y npm audit sin vulnerabilidades reportadas.
- FASE 6 completada; siguiente etapa: negocios. Sin migraciones nuevas ni CRUD de fases posteriores.

## 2026-10-07 — Autenticación JWT y sesiones renovables

### Implementación

- AuthModule y UsersModule: registro CUSTOMER/SELLER, login, perfil protegido y logout.
- Contraseñas bcrypt coste 12, validación UTF-8 de hasta 72 bytes, correo normalizado y rechazo de ADMIN.
- Access JWT HS256 con emisor/audiencia y familia; guard Passport verifica usuario y sesión activos en BD.
- Refresh aleatorio HttpOnly con SHA-256 en PostgreSQL, rotación transaccional y revocación por reutilización.
- Bloqueo por familia para serializar refresh/logout; vigencia absoluta y sesiones independientes por login.
- Cookie SameSite=Strict, Secure en producción, protección por encabezado/origen y respuestas no-store.
- Secreto JWT generado localmente sin imprimirlo ni sobrescribir uno existente; Swagger actualizado.
- Se reutiliza el modelo de la fase 3 sin modificar migraciones.

### Verificación

- TypeScript estricto y build correctos; trece pruebas auth con PostgreSQL real y catorce de API/entorno.
- Diez pruebas SQL existentes correctas; cookies, JWT, concurrencia, reutilización y logout comprobados.
- Las cuentas de prueba se eliminan al terminar y sus sesiones se borran por cascada.
- Instalación reproducida con npm ci, cliente Prisma regenerado y auth correcto tras reinstalar.
- Build HTTP en production comprobado: cookie Secure, perfil, logout, JWT revocado y Swagger oculto.
- Generador JWT conserva byte por byte un entorno existente; archivos privados y compilados ignorados.
- npm run check correcto y npm audit sin vulnerabilidades reportadas.

### Estado

FASE 5 completada. Guía de contratos y pruebas en docs/auth.md. RBAC y rate limiting corresponden
a la fase 6; recuperación de contraseña, verificación de correo y OAuth siguen pendientes.

## 2026-10-06 — Base API NestJS

### Backend

- NestJS 11.2.7 con Express, módulos de configuración, persistencia y salud.
- Inyección de PrismaService con comprobación de conexión al arrancar y desconexión al cerrar.
- Entorno validado sin mostrar secretos, escucha local y comandos de build, ejecución y watch.
- Endpoints `/api/v1/health` y `/api/v1/health/ready`, con 503 cuando no responde PostgreSQL.
- Swagger UI en `/api/docs` y contrato JSON en `/api/docs-json`; desactivado por defecto en producción.
- CORS explícito, Helmet y ValidationPipe global con rechazo de campos extra.
- Formato de errores consistente, sin stack, mensajes internos ni query strings en errores genéricos.

### Verificación

- Pruebas unitarias de entorno y E2E con Nest Testing/Supertest, compiladas con metadata de TypeScript.
- Trece pruebas nuevas correctas, junto a typecheck, build, lint y formato.
- Arranque del build comprobado en el puerto 3000, consulta SQL real y acceso a Swagger/OpenAPI.
- Producción comprobada con Swagger desactivado; sin BD el proceso termina con código 1 sin revelar secretos.
- Instalación reproducida con npm ci y build correcto después de reinstalar.
- Las diez pruebas de integridad PostgreSQL de la fase 3 siguen pasando.
- Override limitado de js-yaml 5.4.3 para Swagger 11; npm audit sin vulnerabilidades reportadas.

### Estado

FASE 4 completada. Solo hay endpoints de infraestructura; no se añaden todavía autenticación,
RBAC ni operaciones comerciales. La siguiente etapa es FASE 5: JWT y Refresh Token.

## 2026-10-06 — Modelo de datos, Prisma y migración inicial

### Modelo y persistencia

- Diagrama entidad-relación presentado antes de implementar el esquema; 14 modelos y siete enums.
- Prisma ORM, Client y adaptador PostgreSQL fijados en 7.10.0.
- Migración inicial con claves foráneas, índices, unicidad y 19 restricciones CHECK adicionales.
- Claves compuestas para impedir cruces de negocio en ítems de pedido y movimientos de inventario.
- Importes decimales, snapshots de compra, sesiones renovables y protección de referencias históricas.
- Cliente generado excluido de Git, configuración TypeScript estricta y comandos de migraciones.
- Preparación de backend/.env a partir del entorno Docker sin imprimir secretos ni sobrescribirlo.
- Seed repetible de ocho categorías globales; no se crean credenciales ni pedidos ficticios todavía.

### Pruebas y dependencias

- Diez pruebas de integración contra PostgreSQL: subpedidos, snapshots, decimales, aislamiento,
  stock, precios, cantidades, totales, SKU y protección del historial.
- Las fixtures se revierten con rollback; se comprobó que no quedan usuarios, productos,
  pedidos ni movimientos de prueba y que solo existen las ocho categorías del seed.
- Seed ejecutado dos veces sin duplicados; migración aplicada y estado al día.
- Validación del esquema, generación del cliente y typecheck correctos.
- Instalación reproducida con `npm ci`, cliente regenerado y diez pruebas correctas tras reinstalar.
- Comparación Prisma sin diferencias entre el esquema y la BD; lint y formato correctos.
- Overrides limitados para deepmerge-ts y mysql2, dependencias transitivas de la CLI Prisma;
  npm audit sin vulnerabilidades reportadas. Motivos y compatibilidad en docs/prisma.md.

### Estado

FASE 3 completada. La estructura de datos está disponible; no hay endpoints, autenticación,
confirmación transaccional de pedidos ni interfaces comerciales implementadas.
La siguiente etapa prevista es FASE 4: Backend NestJS.

## 2026-10-06 — PostgreSQL local con Docker Compose

### Infraestructura y herramientas

- Imagen oficial PostgreSQL 17.11 Alpine con volumen persistente y healthcheck.
- Credenciales obligatorias desde `.env` local; puerto accesible solo por loopback.
- Generador de contraseña aleatoria que conserva cualquier `.env` existente.
- Comandos npm para iniciar, detener, consultar logs y verificar SQL autenticado por TCP.
- Guía de operación, variables y solución de problemas; README actualizado.

### Comprobación

- Docker Desktop iniciado con motor Linux; Compose validado sin imprimir credenciales.
- PostgreSQL saludable y consulta SQL autenticada ejecutada correctamente.
- Dato temporal conservado después de `down` y `up`, recreando el contenedor; tabla de prueba eliminada.
- Conexión al puerto publicado en Windows comprobada.
- Contraseña vacía rechazada por Compose y `.env` existente conservado por el generador.
- `npm run check` y exclusión de `.env` en Git comprobados.

### Ajustes del entorno

La descarga inicial se interrumpió y se completó al reintentar. El puerto 5432 está ocupado en
este equipo; se configuró `POSTGRES_PORT=5433` únicamente en el `.env` local, conservando el
servicio existente. La plantilla mantiene 5432 para instalaciones sin ese conflicto.

### Estado

FASE 2 completada. PostgreSQL disponible; aún no hay esquema Prisma, API ni interfaz comercial.
La siguiente etapa prevista es FASE 3: modelo entidad-relación, Prisma y migraciones.

## 2026-10-05 — Configuración inicial y publicación del proyecto

### Configuración y estructura

- Repositorio con workspaces npm independientes para frontend y backend.
- Directorios por responsabilidades y módulos; todavía sin funcionalidades de aplicación.
- TypeScript estricto, ESLint 10 y Prettier con versiones exactas y lockfile.
- Reglas de editor, finales de línea, versión de Node y exclusiones de archivos privados.
- Plantillas de entorno sin secretos y verificador de configuración inicial.

### Documentación

- Arquitectura modular, flujo multi-vendedor, entidades conceptuales y reglas de consistencia.
- Tecnologías seleccionadas y plan de desarrollo de 22 fases.
- README con instalación, comandos y estado real del proyecto bajo el nombre PatziShop.
- Guía de commits frecuentes, revisión de cambios y publicación al repositorio oficial.
- Instrucciones persistentes del repositorio en `AGENTS.md`.

### Comprobación

- `npm ci`: instalación reproducible desde el lockfile.
- `npm run check`: estructura, lint y formato.
- Exclusiones Git comprobadas para `.env`, dependencias, compilados e imágenes locales;
  los archivos `.env.example` pueden versionarse.

### Estado

FASE 1 completada. No se han implementado Docker, PostgreSQL, API ni interfaz comercial.
La siguiente etapa prevista es FASE 2: Docker + PostgreSQL.
