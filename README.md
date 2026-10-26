# PatziShop · Marketplace multi-vendedor

Marketplace de comercio local con React, NestJS, PostgreSQL y Prisma. Clientes compran productos
de varias tiendas; cada vendedor administra su negocio y sus subpedidos; ADMIN revisa tiendas
y consulta métricas globales.

**Estado: fases 1–21 completadas.** La siguiente etapa será el Deployment (fase 22), que no está
iniciado. El stack disponible es local, con HTTPS de una CA propia.

![Portada real de PatziShop](docs/screenshots/inicio.jpg)

## Empezar

Requiere Git, Node 22.18+ dentro de la rama 22, npm 10 y Docker con motor Linux/Compose v2.
Desde PowerShell:

```powershell
git clone https://github.com/joshi20022021/MARKETPLACE_PATZISHOP.git
Set-Location MARKETPLACE_PATZISHOP
npm run stack:env
npm run stack:up
npm run stack:seed
npm run stack:check
```

Abrir **https://localhost:8443**. El navegador necesita confiar en la CA local; la
[guía Docker](docs/docker.md) explica el certificado, configuración y volúmenes.
Los scripts del stack no necesitan node_modules en el host: las imágenes instalan desde el lockfile.
`npm run stack:down` conserva los datos. No usar down -v para actualizar.

Para desarrollar con recarga en **http://localhost:5173**, seguir la
[instalación desde cero](docs/installation.md). Usa una base y secretos distintos de los del stack.
El seed crea **solo ocho categorías**: no hay usuarios, contraseñas ni productos de demostración.
Registrar cliente/vendedor en la aplicación y aprovisionar la primera cuenta ADMIN mediante la
[utilidad local](docs/admin-dashboard.md). Las capturas usan fixtures ficticias que no se incluyen en el seed.

## Funciones disponibles

- Registro, login, JWT, refresh rotatorio y roles exactos CUSTOMER, SELLER y ADMIN.
- Tiendas sujetas a aprobación, categorías, productos, inventario e imágenes normalizadas.
- Marketplace con filtros, directorio de tiendas y detalle; carrito persistente por cliente.
- Checkout con revisión, confirmación idempotente, recibo y compras separadas por vendedor.
- Atención de subpedidos, historial, cancelación temprana y restitución única de inventario.
- Panel vendedor con métricas propias y gestión de productos; panel ADMIN con revisión de tiendas.
- Stack Docker con migraciones, salud, HTTPS local y persistencia de PostgreSQL, imágenes y CA.

Contra entrega queda pendiente de pago; SIMULATED representa una prueba sin cobro real.
El carrito no reserva stock. Los importes e inventario se calculan y validan en el servidor.
Solo se publican productos elegibles de tiendas ACTIVE, con stock, categoría y vendedor activos.
No hay pagos externos, delivery, facturación, reseñas, favoritos ni despliegue público.

## Documentación

El [índice completo](docs/index.md) enlaza todas las guías de dominio.

| Necesidad                                           | Guía                                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Instalar, configurar y solucionar problemas         | [Instalación](docs/installation.md), [Docker](docs/docker.md)                                          |
| Consultar las 48 operaciones de API y sus contratos | [API v1](docs/api.md)                                                                                  |
| Comprender seed y datos iniciales                   | [Seed](docs/seed.md)                                                                                   |
| Revisar pantallas y límites de la evidencia visual  | [Capturas](docs/screenshots.md)                                                                        |
| Entender estructura, datos y decisiones             | [Arquitectura](docs/architecture.md), [modelo ER](docs/data-model.md), [decisiones](docs/decisions.md) |
| Revisar seguridad y límites                         | [Seguridad](docs/security.md), [revisión](docs/security-review.md)                                     |
| Probar y contribuir                                 | [Testing](docs/testing.md), [contribución](docs/contributing.md)                                       |
| Consultar avance y versiones                        | [Roadmap](docs/roadmap.md), [tecnologías](docs/technology.md), [CHANGELOG](CHANGELOG.md)               |

## Verificar el proyecto

Para desarrollo, después de npm ci, PostgreSQL iniciado, backend/.env y cliente Prisma preparados:

```powershell
npm run test:prepare
npm run test:migrate
npm test
npm run typecheck
npm run build:backend
npm run build:frontend
npm run audit:security
npm run check
```

`npm test` exige patzishop_test local y comprueba limpieza de fixtures. La suite contiene
202 pruebas backend, 120 React y una guarda del runner (323). React usa jsdom; los recorridos
HTTP usan PostgreSQL real. `npm run test:unit` no conecta con PostgreSQL. Consultar
[testing](docs/testing.md) antes de ejecutar comandos históricos por dominio.

`check` comprueba estructura, enlaces locales/documentación, scripts referenciados, TypeScript
frontend, lint y formato. `typecheck` comprueba backend. GitHub Actions repite instalación limpia,
auditoría, migraciones, suite y builds, y un segundo job prueba el stack Docker mediante HTTPS.

## Organización y configuración

```text
frontend/            SPA React, rutas, servicios y pruebas
backend/src/         API NestJS por dominios
backend/prisma/      Esquema, dos migraciones y seed de categorías
backend/test/        Unitarias, integración y recorridos HTTP
scripts/             Preparación, verificación y runner de pruebas
docker/              Caddyfile y plantilla privada del stack
docker-compose.yml   PostgreSQL de desarrollo
compose.stack.yml    Aplicación completa con volúmenes separados
docs/                Guías, decisiones, evidencia y capturas permanentes
```

Las plantillas .env.example son públicas; sus secretos se generan localmente y nunca se versionan.
El .env raíz configura PostgreSQL de desarrollo, backend/.env la API local y docker/.env el stack.
Frontend usa /api/v1 por defecto; toda variable VITE_* es pública. No copiar secretos al build.
Las imágenes se conservan junto con la BD; los datos del stack no se sincronizan con desarrollo.
Swagger se habilita en desarrollo y permanece desactivado en el stack de producción local.

Repositorio: [MARKETPLACE_PATZISHOP](https://github.com/joshi20022021/MARKETPLACE_PATZISHOP).
Los avances se guardan en unidades verificadas con Conventional Commits y se publican sin reescribir historial.
