# Tecnologías y política de versiones

Se eligen líneas principales compatibles con Node.js 22.18 y TypeScript 5.9.
No se utiliza `latest` en los manifiestos. Las dependencias de aplicación se instalarán en su fase,
después de verificar engines y peerDependencies; las versiones exactas quedarán en manifiestos y lockfile.

| Área            | Tecnología seleccionada                                 | Incorporación |
| --------------- | ------------------------------------------------------- | ------------- |
| Runtime         | Node.js 22.18+, npm 10                                  | Fase 1        |
| Lenguaje        | TypeScript 5.9.3                                        | Fase 1        |
| Calidad         | ESLint 10, typescript-eslint 8, Prettier 3              | Fase 1        |
| Datos           | PostgreSQL 17, Prisma ORM 7                             | Fases 2–3     |
| API             | NestJS 11, Express, REST, Swagger                       | Fase 4        |
| Auth            | Passport, JWT, bcrypt                                   | Fase 5        |
| Seguridad       | class-validator, class-transformer, Helmet, throttler   | Fases 4–6     |
| UI              | React 19, Vite 7, React Router 7, Tailwind CSS 4        | Fase 10       |
| Datos frontend  | Axios, TanStack Query 5                                 | Fase 10       |
| Formularios     | React Hook Form 7, Zod 4                                | Fase 10       |
| Estado pequeño  | Zustand 5                                               | Fase 10       |
| Infraestructura | Docker Engine/Desktop, Docker Compose v2                | Fases 2 y 20  |
| Tests           | Jest/Supertest backend; Vitest/Testing Library frontend | Según módulos |

## Configuración instalada

Los manifiestos fijan TypeScript 5.9.3, ESLint 10.12.0 y @eslint/js 10.0.1,
typescript-eslint 8.57.0 y Prettier 3.9.9. La fase 3 añade Prisma ORM, Client y adaptador
PostgreSQL 7.10.0, pg 8.23.1, dotenv 18.0.6 y tsx 4.23.15.
No hay módulos funcionales de API ni librerías de frontend todavía.
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
Tailwind 4 utilizará su integración oficial con Vite en la fase 10.
