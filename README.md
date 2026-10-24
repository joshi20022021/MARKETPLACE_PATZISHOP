# PatziShop · Marketplace multi-vendedor

Proyecto de portafolio de Ingeniería en Ciencias y Sistemas: una plataforma para que distintos
negocios publiquen productos y reciban pedidos, con experiencias de cliente, vendedor y administrador.

**Estado actual: fases 1–19 completadas.** La revisión de seguridad de fase 18 se completó después
de consolidar testing. Incluye entradas HTTP estrictas, controles de origen, respuestas no-store
y auditoría de dependencias; consulta [la revisión](docs/security-review.md).
Suite consolidada, PostgreSQL de pruebas separado, unitarias, integración y recorridos HTTP reproducibles.
Métricas globales y revisión de tiendas
con aprobación, rechazo, suspensión y reactivación protegidos por versión. Estados e historial por tienda,
cancelación temprana del cliente y reposición única de inventario. Panel con métricas propias, listado y filtros,
creación/edición de productos, ajustes de stock e imágenes privadas conectados a la API.
Confirmación con subpedidos por tienda,
entrega histórica, inventario transaccional, protección contra duplicados, recibo e historial propio.
Contra entrega queda pendiente; pago simulado queda pagado como prueba, sin cobrar dinero real.
Carrito persistente para clientes, cantidades validadas,
productos de varias tiendas y totales calculados en el servidor. Catálogo con búsqueda, categorías, precios,
orden y paginación; directorio de tiendas, tienda pública y detalle con galería conectados a la API.
También incluye registro, login, sesión renovable, cuenta y formulario de tienda propia.
Solo se muestran productos disponibles de tiendas ACTIVE y vendedores activos.
Las tiendas nacen en PENDING; una cuenta ADMIN puede revisarlas desde `/admin/negocios`.
Las características siguientes son el alcance planificado.

## Alcance del MVP

- Autenticación JWT, refresh tokens y roles ADMIN, SELLER y CUSTOMER.
- Tiendas sujetas a aprobación, categorías y productos con inventario.
- Catálogo paginado, carrito, checkout contra entrega y pago simulado.
- Compras con subpedidos independientes por vendedor.
- Dashboard del vendedor y administración básica.
- Control de propiedad, movimientos de inventario y transacciones.

## Arquitectura y documentación

Frontend React y backend NestJS separados en npm workspaces; PostgreSQL mediante Prisma.
Consulta [arquitectura](docs/architecture.md), [tecnologías](docs/technology.md),
[plan de desarrollo](docs/roadmap.md) y [guía de contribución](docs/contributing.md).
El repositorio oficial es [MARKETPLACE_PATZISHOP](https://github.com/joshi20022021/MARKETPLACE_PATZISHOP).
El [registro de cambios](CHANGELOG.md) documenta los avances y sus comprobaciones.
Consulta la [guía de PostgreSQL local](docs/database.md) para iniciar, verificar y detener la BD.
El [modelo entidad-relación](docs/data-model.md) explica las decisiones y la
[guía de Prisma](docs/prisma.md) describe migraciones, seed y pruebas.
La [guía del backend](docs/backend.md) documenta el arranque, entorno y endpoints disponibles.
La [guía de autenticación](docs/auth.md) explica sesiones, cookies y cómo probar los cinco endpoints.
La [guía de seguridad](docs/security.md) documenta RBAC, propiedad, cuotas y su integración en futuros módulos.
La [guía de negocios](docs/businesses.md) explica los cinco endpoints, validaciones y visibilidad pública.
La [guía de categorías](docs/categories.md) explica la gestión ADMIN, consulta pública y seed repetible.
La [guía de productos](docs/products.md) explica CRUD propio, estados, inventario, imágenes y pruebas.
La [guía del frontend](docs/frontend.md) explica rutas, formularios, sesión y proxy local.
La [guía del marketplace](docs/marketplace.md) explica catálogo público, filtros y visibilidad.
La [guía del carrito](docs/cart.md) explica cantidades, totales, disponibilidad y concurrencia.
La [guía del checkout](docs/checkout.md) explica entrega, revisión y contratos de pago.
La [guía de pedidos](docs/orders.md) explica confirmación, idempotencia, inventario y consultas por propietario.
La [guía del panel vendedor](docs/seller-dashboard.md) explica métricas, CRUD e imágenes privadas.
La [guía de gestión de pedidos](docs/order-management.md) explica estados, cancelaciones e historial.
La [guía del administrador](docs/admin-dashboard.md) explica métricas, revisión y creación local de la primera cuenta ADMIN.
La [guía de testing](docs/testing.md) explica la base aislada, comandos y flujo de integración continua.

```text
PROYECTO_VENTAS/
├── frontend/             # SPA React: marketplace, autenticación, cuenta y tienda propia
│   ├── src/              # Componentes, páginas, estado, servicios y rutas
│   ├── .env.example
│   └── package.json
├── backend/              # API NestJS, autenticación, negocios, categorías, productos y media
│   ├── src/              # Módulos por dominio
│   ├── prisma/           # Esquema, migraciones y seed de categorías
│   ├── test/             # Integración real con PostgreSQL
│   ├── .env.example
│   └── package.json
├── docs/                 # Decisiones, tecnologías y fases
├── scripts/              # Verificación de configuración
├── docker-compose.yml    # PostgreSQL local y volumen persistente
├── .env.example          # Plantilla de configuración Docker
├── eslint.config.mjs
├── tsconfig.base.json
├── package.json
└── package-lock.json
```

## Requisitos de esta etapa

- Node.js 22.18.0 o posterior dentro de la rama 22 (consulta `.nvmrc`).
- npm 10; la configuración inicial se verificó con npm 10.9.3.
- Git.
- Docker Desktop iniciado con motor Linux y Docker Compose v2.

## Instalación y comprobación

Desde PowerShell:

```powershell
Set-Location 'C:\Users\edgar\Downloads\PROYECTO_VENTAS'
node --version
npm --version
npm ci
npm run db:env
npm run db:up
npm run db:backend-env
npm run auth:env
npm run prisma:validate
npm run prisma:generate
npm run prisma:deploy
npm run db:seed
npm run typecheck
npm run test:database
npm run build:backend
npm run test:api
npm run test:auth
npm run test:security
npm run test:businesses
npm run test:categories
npm run test:products
npm run test:marketplace
npm run test:cart
npm run test:checkout
npm run test:orders
npm run test:order-transitions
npm run test:admin
npm run test:seller-dashboard
npm run test:frontend
npm run build:frontend
npm run check
```

`check` verifica los workspaces, la estructura, TypeScript del frontend, ESLint y el formato.
Debe finalizar con código 0 y el mensaje `FASE 1 OK`, sin errores de lint ni formato.
`typecheck` comprueba el código TypeScript del backend y `test:database` verifica restricciones
en PostgreSQL. `test:api` comprueba la base HTTP de NestJS y la configuración del entorno.
`test:auth` comprueba las sesiones con PostgreSQL real.
`test:security` comprueba roles, aislamiento entre vendedores/clientes, escrituras acotadas,
rate limiting y rechazo de JSON grande. Los endpoints de prueba no se publican en la aplicación.
`test:businesses` verifica creación, edición, aislamiento y consulta pública de tiendas con PostgreSQL real.
`test:categories` verifica gestión ADMIN, activación, consulta pública y conservación de datos en el seed.
`test:products` verifica CRUD propio, stock concurrente, borrado histórico y carga/visibilidad de imágenes reales.
`test:marketplace` verifica catálogo público, filtros, proyección comercial, páginas y visibilidad con PostgreSQL.
`test:cart` verifica propiedad, roles, cantidades, totales por tienda, disponibilidad y agregados concurrentes.
`test:checkout` verifica entrega, métodos de pago, recálculo y ausencia de efectos de compra con PostgreSQL real.
`test:orders` verifica transacciones, separación por tienda, stock concurrente, idempotencia, rollback y propiedad.
`test:order-transitions` verifica permisos, secuencia de estados, cancelación, reposición y concurrencia.
`test:admin` verifica métricas globales, revisión concurrente, visibilidad, versiones y aprovisionamiento ADMIN.
`test:seller-dashboard` verifica métricas del negocio autenticado, vacíos, estados e importes propios.
`test:frontend` verifica contratos, renovación, rutas, formularios y conexión simulada a la API.
`build:frontend` verifica TypeScript estricto y genera el SPA en `frontend/dist`.

Desde fase 19, la verificación completa se puede ejecutar contra una base separada:

```powershell
npm run test:prepare
npm run test:migrate
npm test
```

Requiere el PostgreSQL local iniciado y backend/.env preparado. `npm test` exige `patzishop_test`,
compila backend una vez, ejecuta todas sus suites y las de React, y comprueba limpieza de fixtures.
`npm run test:unit` no conecta con PostgreSQL. Los comandos individuales anteriores conservan su
entorno histórico; consulta [testing](docs/testing.md) para aislamiento, CI y límites.

Para iniciar la API con recompilación automática:

```powershell
npm run dev:backend
```

Salud: `http://127.0.0.1:3000/api/v1/health`. Conexión PostgreSQL:
`http://127.0.0.1:3000/api/v1/health/ready`. Swagger: `http://127.0.0.1:3000/api/docs`.
Detén el servidor con Ctrl+C. Para ejecutar el build, utiliza `npm run start:backend`.

Con la API iniciada, abre otra terminal y ejecuta:

```powershell
npm run dev:frontend
```

Abre **http://localhost:5173**. El proxy conecta `/api` con NestJS en 127.0.0.1:3000.
El catálogo está en `/catalogo` y el directorio en `/tiendas`; muestran estados vacíos si no hay publicaciones elegibles.
Los clientes autenticados pueden agregar productos y administrar su carrito en `/carrito`.
El carrito no reserva stock. Un carrito válido permite revisar y confirmar en `/checkout`;
la confirmación descuenta inventario y genera un recibo. `/pedidos` muestra las compras del cliente.
Puedes registrar una cuenta de vendedor y crear su tienda; el estado inicial es «En revisión».
El panel está en `/vendedor` y la gestión de productos en `/vendedor/productos`.
Los subpedidos se atienden en `/vendedor/pedidos`; el cliente puede cancelar antes de la preparación.
Una tienda en revisión prepara productos inactivos; activar requiere aprobación administrativa.
No se incluyen credenciales de administrador ni cuentas de demostración. Consulta la
[guía del frontend](docs/frontend.md) para configurar otros orígenes y probar el build.
El propietario puede crear su cuenta con `npm run admin:create`; la [guía del administrador](docs/admin-dashboard.md)
explica cómo introducir la contraseña sin guardarla en el historial. Después de ingresar,
Administración abre `/admin/dashboard`. Las métricas separan compras y subpedidos; los importes
contra entrega no son cobros y las simulaciones no representan dinero real.

Para dar formato tras editar archivos:

```powershell
npm run format
```

## Variables de entorno

Las plantillas están en `.env.example`, `backend/.env.example` y `frontend/.env.example`.
El `.env` raíz configura Docker; `npm run db:env` lo genera con contraseña aleatoria sin sobrescribirlo.
`npm run db:backend-env` crea la conexión Prisma en `backend/.env` desde los datos locales,
sin mostrar secretos ni sobrescribir un entorno existente. NestJS valida su entorno antes de iniciar.
`npm run auth:env` genera el secreto JWT faltante sin mostrarlo ni cambiar un secreto existente.
Frontend usa `VITE_API_URL=/api/v1` por defecto; su `.env` es opcional en desarrollo local.
Los secretos están vacíos deliberadamente y deben generarse localmente. Nunca versionar `.env`.
Toda variable `VITE_*` se expone al navegador y debe contener exclusivamente configuración pública.

| Variable backend        | Uso previsto                    | Fase |
| ----------------------- | ------------------------------- | ---- |
| NODE_ENV                | Entorno de ejecución            | 4    |
| PORT                    | Puerto de la API                | 4    |
| HOST                    | IP de escucha (127.0.0.1)       | 4    |
| CORS_ORIGIN             | Origen permitido del frontend   | 4    |
| SWAGGER_ENABLED         | Activar documentación HTTP      | 4    |
| DATABASE_URL            | Conexión privada a PostgreSQL   | 3    |
| JWT_ACCESS_SECRET       | Firma de access tokens          | 5    |
| JWT_ACCESS_TTL          | Duración de access tokens       | 5    |
| REFRESH_TOKEN_TTL_DAYS  | Vigencia de sesiones renovables | 5    |
| VITE_API_URL (frontend) | URL pública de la API           | 10   |

## Etapas posteriores

Para iniciar y comprobar PostgreSQL:

```powershell
npm run db:env
npm run db:up
npm run db:check
```

Debe mostrarse `FASE 2 OK`. `npm run db:down` detiene el entorno conservando datos.
Los detalles de conexión, variables, persistencia y solución de problemas están en
[docs/database.md](docs/database.md).

Para revisar la migración aplicada, ejecuta `npm run prisma:status`.
El seed asegura ocho slugs de categorías sin sobrescribir ediciones administrativas; los usuarios, tiendas, productos y pedidos
de demostración se agregarán cuando existan sus reglas de negocio. No hay credenciales de prueba.
La API usa `/api/v1`; negocios, categorías y productos del vendedor están disponibles.
Los archivos de productos se guardan en `backend/uploads/product-images`, fuera de Git;
su conservación y copia deben acompañar a la BD. No hay cuentas de demostración ni tiendas aprobadas en el seed.
Las capturas de documentación se consolidarán en la fase 21; las comprobaciones actuales de
navegador y sus límites se registran en [docs/frontend.md](docs/frontend.md).

La siguiente etapa es **Dockerización completa (fase 20)**; no se inicia sin petición.
