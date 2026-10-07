# Base API NestJS — fase 4

NestJS 11.2.7 con Express y TypeScript estricto. Se mantienen separados arranque HTTP,
configuración, persistencia y salud. No existen todavía endpoints de usuarios, JWT, negocios,
categorías, productos o pedidos. Los directorios de esos dominios siguen reservados para sus fases.

## Archivos y responsabilidades

- `src/main.ts`: arranque, escucha y cierre del proceso.
- `src/app.module.ts`: módulos de configuración, salud y filtro global.
- `src/config/environment.ts`: validación del entorno sin mostrar valores privados.
- `src/config/configure-app.ts`: prefijo, CORS, Helmet, ValidationPipe y Swagger.
- `src/database/`: PrismaService inyectable y control de conexión/desconexión.
- `src/health/`: controller, service y respuestas documentadas.
- `src/common/`: formato de errores HTTP y DTO OpenAPI.
- `nest-cli.json`, `tsconfig.build.json` y `tsconfig.test.json`: compilación y pruebas con metadata.
- `test/environment.unit.test.ts`, `test/api.e2e.test.ts`: configuración y contratos HTTP.

## Preparación e inicio

Desde la raíz del repositorio:

```powershell
npm ci
npm run db:env
npm run db:up
npm run db:backend-env
npm run prisma:generate
npm run prisma:deploy
npm run dev:backend
```

Nest CLI compila con metadata de decoradores y reinicia al cambiar el código. La API usa por
defecto `127.0.0.1:3000`. No se utiliza tsx para arrancar Nest porque las pruebas deben verificar
también metadata e inyección de dependencias emitidas por TypeScript.
Para detener el servidor de desarrollo, usa Ctrl+C en su terminal.

Para ejecutar la compilación sin watch:

```powershell
npm run build:backend
npm run start:backend
```

`start:backend` requiere el build y el cliente Prisma previamente generado. Los comandos root
ejecutan la aplicación dentro del workspace backend para cargar su `.env`.

## Configuración

| Variable        | Valor predeterminado      | Validación                                              |
| --------------- | ------------------------- | ------------------------------------------------------- |
| NODE_ENV        | development               | development, test o production                          |
| HOST            | 127.0.0.1                 | Dirección IP; 0.0.0.0 permite escuchar en un contenedor |
| PORT            | 3000                      | Entero de 1 a 65535                                     |
| DATABASE_URL    | Obligatoria               | URL PostgreSQL con host y nombre de BD                  |
| CORS_ORIGIN     | http://localhost:5173     | Un origen HTTP(S) explícito, sin rutas ni credenciales  |
| SWAGGER_ENABLED | true; false en production | true o false, nunca texto ambiguo                       |

`HOST` y `SWAGGER_ENABLED` son opcionales: los `.env` existentes funcionan sin sobrescribirlos.
Los errores de configuración enumeran nombres de variables, nunca la URL privada o contraseña.
JWT_ACCESS_SECRET y otras variables de autenticación aún no se consumen.

Prisma usa un pool de hasta diez conexiones y límites de cinco segundos para conexión y consultas.
El arranque verifica SQL antes de empezar a escuchar; si falla, la API cierra recursos y termina
con error. PrismaService se desconecta al cerrar la aplicación; se habilitan hooks de apagado.
Se comprobará la existencia de las tablas al utilizar los módulos de negocio; SELECT 1 no valida
que todas las migraciones estén aplicadas.

## Endpoints actuales

| Método | Ruta                 | Comprobación                                 |
| ------ | -------------------- | -------------------------------------------- |
| GET    | /api/v1/health       | Liveness del proceso, sin consulta a la BD   |
| GET    | /api/v1/health/ready | Readiness con consulta SQL; 503 si falla     |
| GET    | /api/docs            | Swagger UI cuando está habilitado            |
| GET    | /api/docs-json       | Contrato OpenAPI JSON cuando está habilitado |

Desde otra terminal:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/v1/health
Invoke-RestMethod http://127.0.0.1:3000/api/v1/health/ready
```

La primera respuesta indica `success=true` y `status=ok`; la segunda añade `database=up`.
Swagger se abre en `http://127.0.0.1:3000/api/docs`. La ruta raíz `/` no es un catálogo y devuelve 404.

## Errores y validación

```json
{
  "success": false,
  "statusCode": 503,
  "message": "Base de datos no disponible",
  "error": "DATABASE_UNAVAILABLE",
  "path": "/api/v1/health/ready",
  "timestamp": "2026-10-06T12:00:00.000Z"
}
```

Errores inesperados devuelven mensaje genérico sin stack. El 404 de rutas inexistentes no refleja
query strings. Los futuros módulos deben usar códigos de error estables y mensajes públicos.
ValidationPipe rechaza campos extra y DTO inválidos; desactiva conversiones implícitas de valores
y omite datos privados de los errores. Cada endpoint futuro necesita DTO con sus decoradores.

Helmet añade encabezados de seguridad. CORS declara únicamente el origen configurado y permite
credenciales para la futura autenticación. Un origen distinto no recibe autorización para leer
desde el navegador; CORS no sustituye guards, permisos o protección CSRF.
Rate limiting y RBAC se implementarán en la fase 6, junto con los endpoints sensibles.

## Pruebas

```powershell
npm run typecheck
npm run build:backend
npm run test:api
npm run test:database
npm run check
```

Las trece pruebas nuevas cubren validación del entorno, flags de Swagger, salud, fallo de BD,
errores, DTO, JSON malformado, CORS, encabezados, OpenAPI y el módulo Prisma real. Algunas usan un proveedor
controlado para simular fallos sin detener PostgreSQL; una inicializa y consulta la BD real.
Se usan node:test, Nest Testing y Supertest. Las pruebas HTTP se compilan antes de ejecutarse
para probar metadata y DI. Los controllers de prueba nunca se importan en la aplicación real.
Los resultados compilados quedan en `.test-dist`, excluido de Git.

Las diez pruebas de integridad SQL de la fase 3 se mantienen. No se prueban todavía login,
autorización o operaciones comerciales porque aún no están implementados.
También se comprobó el proceso compilado escuchando en 3000, Swagger oculto por defecto en
producción y salida con código 1 sin revelar secretos al fallar la conexión de arranque.
Los procesos usados para estas comprobaciones se detuvieron al terminar.

## Compatibilidad de Swagger

Swagger 11.4.7 declara compatibilidad con NestJS 11. Se fija su dependencia transitiva js-yaml
en 5.4.3 mediante un override limitado para corregir
[el aviso GHSA-r3ph-w7gj-g6xm](https://github.com/advisories/GHSA-r3ph-w7gj-g6xm), manteniendo
la versión principal de Swagger. Se verifica el contrato OpenAPI después del ajuste.

Referencias oficiales: [configuración de NestJS](https://docs.nestjs.com/techniques/configuration),
[Swagger](https://docs.nestjs.com/openapi/introduction) y
[validación](https://docs.nestjs.com/techniques/validation).
