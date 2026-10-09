# Tecnologías y política de versiones

Se eligen líneas principales compatibles con Node.js 22.18 y TypeScript 5.9.
No se utiliza `latest` en los manifiestos. Las dependencias de aplicación se instalarán en su fase,
después de verificar engines y peerDependencies; las versiones exactas quedarán en manifiestos y lockfile.

| Área            | Tecnología seleccionada                                    | Incorporación |
| --------------- | ---------------------------------------------------------- | ------------- |
| Runtime         | Node.js 22.18+, npm 10                                     | Fase 1        |
| Lenguaje        | TypeScript 5.9.3                                           | Fase 1        |
| Calidad         | ESLint 10, typescript-eslint 8, Prettier 3                 | Fase 1        |
| Datos           | PostgreSQL 17, Prisma ORM 7                                | Fases 2–3     |
| API             | NestJS 11, Express, REST, Swagger                          | Fase 4        |
| Auth            | Passport, JWT, bcrypt                                      | Fase 5        |
| Seguridad       | class-validator, class-transformer, Helmet, throttler      | Fases 4–6     |
| UI              | React 19, Vite 7, React Router 7, Tailwind CSS 4           | Fase 10       |
| Datos frontend  | Axios, TanStack Query 5                                    | Fase 10       |
| Formularios     | React Hook Form 7, Zod 4                                   | Fase 10       |
| Estado pequeño  | Zustand 5                                                  | Fase 10       |
| Infraestructura | Docker Engine/Desktop, Docker Compose v2                   | Fases 2 y 20  |
| Tests           | node:test/Nest Testing/Supertest; Vitest frontend previsto | Según módulos |

## Configuración instalada

Los manifiestos fijan TypeScript 5.9.3, ESLint 10.12.0 y @eslint/js 10.0.1,
typescript-eslint 8.57.0 y Prettier 3.9.9. La fase 3 añade Prisma ORM, Client y adaptador
PostgreSQL 7.10.0, pg 8.23.1, dotenv 18.0.6 y tsx 4.23.15.
La fase 4 añade NestJS 11.2.7, Config 4.0.4, Swagger 11.4.7, Nest CLI 11.0.24,
class-validator 0.15.1, class-transformer 0.5.1 y Helmet 8.3.0. Las pruebas HTTP utilizan
Nest Testing 11.2.7 y Supertest 7.3.1, ejecutados con node:test después de compilar.
La fase 5 añade @nestjs/jwt 11.0.2, @nestjs/passport 11.0.5, passport 0.7.0,
passport-jwt 4.0.1, bcrypt 6.0.0 y cookie-parser 1.4.7, con sus tipos TypeScript.
Se verificaron peerDependencies compatibles con NestJS 11 y bcrypt con Node 22.
La fase 6 añade @nestjs/throttler 6.7.1, compatible con NestJS 11 y reflect-metadata 0.2.
La política utiliza guards y metadata de NestJS 11, conservando Passport para JWT.
La fase 7 añade endpoints de negocios usando las dependencias existentes, sin cambiar el lockfile.
La fase 8 añade categorías y ajusta el seed, también sin dependencias, entorno ni migraciones nuevas.
No hay librerías de frontend todavía.
`npm ci` reproduce las dependencias del lockfile; `npm install` se usa al cambiar manifiestos.
Se eligió ESLint 10 al comprobar que npm marca ESLint 9 como fuera de soporte.
ESLint 10 admite Node 22.13+ y typescript-eslint 8.57.0 declara compatibilidad con ESLint 10.

## Compatibilidad

- [Vite: requisitos de Node](https://vite.dev/guide/): Node 20.19+ o 22.12+.
- [Prisma: requisitos](https://docs.prisma.io/docs/orm/reference/system-requirements).
- [Prisma: estado de versiones](https://www.prisma.io/docs/orm/release-status).
- [NestJS: versiones oficiales](https://github.com/nestjs/nest/releases).

Las líneas elegidas son una base deliberada; no se migrará automáticamente a una nueva versión
principal. Prisma CLI, Client y adaptador utilizan la misma versión exacta.
Su configuración y overrides de dependencias transitivas se documentan en [la guía de Prisma](prisma.md).
Swagger utiliza js-yaml 5.4.3 mediante un override limitado, explicado en [la guía del backend](backend.md).
Tailwind 4 utilizará su integración oficial con Vite en la fase 10.
