# PatziShop · Marketplace multi-vendedor

Proyecto de portafolio de Ingeniería en Ciencias y Sistemas: una plataforma para que distintos
negocios publiquen productos y reciban pedidos, con experiencias de cliente, vendedor y administrador.

**Estado actual: FASE 6 — RBAC y seguridad.** La API ofrece autenticación, rutas protegidas por
defecto, permisos exactos por rol, filtros de propiedad y límites de solicitudes. PostgreSQL,
Prisma, salud, validación y Swagger están disponibles. El CRUD comercial y las pantallas siguen pendientes.
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

```text
PROYECTO_VENTAS/
├── frontend/             # Workspace reservado para React (fase 10)
│   ├── src/              # Componentes, páginas, estado, servicios y rutas
│   ├── .env.example
│   └── package.json
├── backend/              # API NestJS, salud y autenticación
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
npm run check
```

`check` verifica los workspaces, la estructura, la configuración estricta, ESLint y el formato.
Debe finalizar con código 0 y el mensaje `FASE 1 OK`, sin errores de lint ni formato.
`typecheck` comprueba el código TypeScript del backend y `test:database` verifica restricciones
en PostgreSQL. `test:api` comprueba la base HTTP de NestJS y la configuración del entorno.
`test:auth` comprueba las sesiones con PostgreSQL real. No se validan flujos comerciales todavía.
`test:security` comprueba roles, aislamiento entre vendedores/clientes, escrituras acotadas,
rate limiting y rechazo de JSON grande. Los endpoints de prueba no se publican en la aplicación.

Para iniciar la API con recompilación automática:

```powershell
npm run dev:backend
```

Salud: `http://127.0.0.1:3000/api/v1/health`. Conexión PostgreSQL:
`http://127.0.0.1:3000/api/v1/health/ready`. Swagger: `http://127.0.0.1:3000/api/docs`.
Detén el servidor con Ctrl+C. Para ejecutar el build, utiliza `npm run start:backend`.

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
Frontend se configurará en la fase 10.
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
El seed actual incluye ocho categorías y es repetible; los usuarios, tiendas, productos y pedidos
de demostración se agregarán cuando existan sus reglas de negocio. No hay credenciales de prueba.
La API usa `/api/v1`; los recursos de negocio se incorporarán en sus fases.
Las capturas se añadirán cuando se implemente la interfaz.

El proyecto avanzará por etapas verificables; la siguiente es **Negocios (fase 7)**.
