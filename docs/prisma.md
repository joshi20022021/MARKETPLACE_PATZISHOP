# Prisma, migraciones y comprobaciones

La fase 3 incorpora Prisma ORM 7.10.0, Client y adaptador PostgreSQL en la misma versión.
El esquema se explica en [modelo de datos](data-model.md). La fase 4 integra el cliente en NestJS
mediante PrismaService; autenticación, seguridad, negocios y categorías se añaden en las fases 5–8.

## Archivos

- `backend/prisma/schema.prisma`: modelos, enums, relaciones, índices y unicidad.
- `backend/prisma.config.ts`: ubicación del esquema, migraciones, seed y URL privada.
- `backend/prisma/migrations/`: historial SQL versionado, incluyendo restricciones CHECK.
- `backend/src/config/database.ts`: cliente con adaptador PostgreSQL para herramientas CLI.
- `backend/src/database/`: módulo Prisma inyectable de la API, añadido en la fase 4.
- `backend/prisma/seed.ts`: ocho categorías iniciales, sin usuarios ni contraseñas.
- `backend/prisma/categories.ts`: datos base y upsert que preserva ediciones administrativas.
- `backend/test/`: pruebas de restricciones reales sobre PostgreSQL.
- `backend/src/generated/prisma/`: cliente generado localmente, excluido de Git.

## Instalación desde un checkout

Desde la raíz del proyecto, con Node 22.18+ y Docker Desktop iniciado:

```powershell
npm ci
npm run db:env
npm run db:up
npm run db:backend-env
npm run prisma:validate
npm run prisma:generate
npm run prisma:deploy
npm run db:seed
npm run prisma:status
npm run typecheck
npm run test:database
npm run check
```

`db:backend-env` toma los datos del `.env` raíz y crea `backend/.env` con la URL PostgreSQL
local. No imprime secretos y no sobrescribe archivos existentes. Si cambias credenciales o puerto,
actualiza también el entorno del backend manualmente. `backend/.env` está excluido de Git.
Los comandos de Prisma y tests se ejecutan dentro del workspace backend para cargar su entorno.

`prisma:generate` se ejecuta explícitamente: el código generado no se sube al repositorio ni se
depende de la generación automática al migrar. El cliente usa CommonJS, compatible con la base
prevista de NestJS 11. El backend tiene configuración TypeScript estricta con comprobación sin emitir.

## Migraciones

`prisma:deploy` aplica migraciones ya revisadas; no crea esquema desde inferencias ni reinicia datos.
No requiere shadow database. `prisma:status` debe indicar que las migraciones están al día.

Para futuros cambios de esquema en desarrollo:

```powershell
npm run prisma:migrate -- --name describe_change
npm run prisma:generate
```

`prisma:migrate` usa `migrate dev`, que requiere permisos para una BD temporal de comparación.
La instancia Docker local los permite. Si hay drift o una petición de reset, revisar primero la causa;
no aceptar borrar datos automáticamente. No modificar una migración ya aplicada o publicada.

La migración inicial incluye restricciones SQL que Prisma Schema no expresa: stock y precios
no negativos, cantidades positivas, totales de línea consistentes, movimientos con signo y saldos
válidos, emails normalizados y marcas temporales coherentes. Revisarlas al generar nuevas migraciones.

## Seed y pruebas

El seed hace upsert por slug de las ocho categorías y crea solo las faltantes; desde la fase 8 conserva
todos los datos existentes, incluidos nombres editados y desactivaciones. No elimina registros.
Se ejecuta manualmente y se puede repetir sin duplicar un mismo slug. Si se renombra un slug base,
el siguiente seed recrea ese slug como otro registro; detalles en [categorías](categories.md).
El seed completo con usuarios, tiendas, productos y pedidos se ampliará junto a los módulos
que implementen sus reglas. Actualmente no hay usuarios de acceso de demostración.

Las pruebas usan Prisma y PostgreSQL reales. Crean fixtures con IDs y emails únicos dentro de
transacciones y hacen rollback al terminar, incluso si fallan. Los hashes de las fixtures son
marcadores de prueba, nunca credenciales de usuarios. Las secuencias pueden avanzar aunque se
deshaga una transacción: los números públicos de pedido pueden tener huecos.

Cubren compras con dos tiendas, snapshots y precisión decimal, claves compuestas de aislamiento,
stock/precios negativos, cantidades de carrito, totales manipulados, SKU por tienda, protección
de productos históricos y consistencia de movimientos. Estas pruebas SQL no verifican flujos HTTP;
JWT, guards, negocios y categorías tienen suites propias. Checkout, concurrencia de confirmación
y transiciones de pedidos siguen pendientes.

## Dependencias transitivas de la CLI

Prisma 7.10.0 fija versiones de deepmerge-ts y mysql2 señaladas por npm audit.
La raíz utiliza overrides limitados a `@prisma/config → deepmerge-ts@8.0.2` y
`prisma → mysql2@3.24.5`. No se cambió de versión principal de Prisma ni se usó audit fix con force.
La configuración utilizada contiene objetos convencionales; no depende del comportamiento de
Map que cambió en deepmerge-ts 8. Los comandos de configuración, generación y migración se
comprueban con estas versiones. Revisar y retirar los overrides cuando Prisma incorpore los parches.

Referencias: [aviso deepmerge-ts](https://github.com/advisories/GHSA-ggr8-5vv4-36mx),
[cambios en deepmerge-ts 8](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0) y
[aviso mysql2](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3).

## Referencias de Prisma

- [Prisma Config](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference).
- [Prisma Schema](https://www.prisma.io/docs/orm/v7/prisma-schema/overview).
