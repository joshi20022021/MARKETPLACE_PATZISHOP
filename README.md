# PatziShop · Marketplace multi-vendedor

Proyecto de portafolio de Ingeniería en Ciencias y Sistemas: una plataforma para que distintos
negocios publiquen productos y reciban pedidos, con experiencias de cliente, vendedor y administrador.

**Estado actual: FASE 2 — PostgreSQL local con Docker Compose.** La infraestructura de base de datos
está configurada; todavía no hay esquema del marketplace, API ni pantallas comerciales.
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

```text
PROYECTO_VENTAS/
├── frontend/             # Workspace reservado para React (fase 10)
│   ├── src/              # Componentes, páginas, estado, servicios y rutas
│   ├── .env.example
│   └── package.json
├── backend/              # Workspace reservado para NestJS (fase 4)
│   ├── src/              # Módulos por dominio
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
npm run check
```

`check` verifica los workspaces, la estructura, la configuración estricta, ESLint y el formato.
Debe finalizar con código 0 y el mensaje `FASE 1 OK`, sin errores de lint ni formato.
Esta comprobación corresponde al repositorio inicial; no valida flujos comerciales todavía.

Para dar formato tras editar archivos:

```powershell
npm run format
```

## Variables de entorno

Las plantillas están en `.env.example`, `backend/.env.example` y `frontend/.env.example`.
El `.env` raíz configura Docker; `npm run db:env` lo genera con contraseña aleatoria sin sobrescribirlo.
Los entornos de las aplicaciones se completarán cuando existan sus consumidores.
Los secretos están vacíos deliberadamente y deben generarse localmente. Nunca versionar `.env`.
Toda variable `VITE_*` se expone al navegador y debe contener exclusivamente configuración pública.

| Variable backend        | Uso previsto                    | Fase |
| ----------------------- | ------------------------------- | ---- |
| NODE_ENV                | Entorno de ejecución            | 4    |
| PORT                    | Puerto de la API                | 4    |
| CORS_ORIGIN             | Origen permitido del frontend   | 6    |
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

Modelo entidad-relación, Prisma y migraciones: fase 3.
API REST bajo `/api/v1` y Swagger: fase 4 en adelante. Seed y usuarios de prueba se incorporarán
cuando existan las entidades y autenticación; actualmente no hay credenciales de prueba.
Las capturas se añadirán cuando se implemente la interfaz.

El proyecto avanzará por etapas verificables; la siguiente es **Prisma y modelo de datos**.
