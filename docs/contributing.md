# Trabajo por etapas y Git

Cada fase debe explicar su alcance, archivos, decisiones, comandos y verificación.
Resolver los errores antes de continuar; registrar honestamente lo implementado y lo pendiente.

## Conventional Commits

Usar commits pequeños y coherentes:

```text
chore: initialize marketplace repository
docs: document marketplace architecture
feat: add seller product management
fix: prevent seller access to external products
refactor: separate order calculation service
```

Repositorio oficial: [MARKETPLACE_PATZISHOP](https://github.com/joshi20022021/MARKETPLACE_PATZISHOP).
Rama principal `main`; ramas de trabajo como `feat/seller-products` o `fix/order-stock` cuando convenga.
No hace falta introducir Gitflow para este proyecto. Revisar `git diff` antes de cada commit.

## Frecuencia y documentación

Por petición del propietario, guardar cada unidad coherente de trabajo al terminarla y verificarla.
Una fase puede tener varios commits: configuración, regla de negocio, corrección, prueba o documentación.
La cantidad de commits depende de los cambios reales, no del número de fases ni de una cuota.
No crear commits vacíos ni alterar fechas para aparentar actividad.

Los mensajes describen qué cambió; el cuerpo explica el motivo o la validación cuando sea útil.
Actualizar `CHANGELOG.md` con avances relevantes, comprobaciones y limitaciones, y mantener README
y documentación técnica alineados con la implementación. Los cambios pequeños no necesitan
una entrada individual de changelog si quedan cubiertos por una entrada coherente.

Conservar el historial existente del remoto. Subir commits verificados a `origin` sin force push.
Antes de publicar, consultar cambios remotos y resolver cualquier divergencia sin perder trabajo.

## Antes de guardar cambios

Desde fase 19, usar la suite consolidada para la regresión completa en PostgreSQL separado:

```powershell
npm run test:prepare
npm run test:migrate
npm test
```

Requiere el entorno local preparado; el runner nunca usa la base de desarrollo como alternativa.
No ejecutar suites simultáneas contra patzishop_test. Los comandos individuales por dominio de
abajo siguen disponibles con su entorno histórico. Guía, pruebas rápidas y CI en [testing](testing.md).

```powershell
npm run check
npm run audit:security
git status --short
git diff --check
```

`check` verifica configuración, TypeScript del frontend, lint y formato. Para cambios en backend, ejecutar también
`npm run typecheck`, `npm run build:backend`, `npm run test:api` y las pruebas de datos pertinentes
con `npm run test:database`. Para autenticación ejecutar también `npm run test:auth`;
requiere PostgreSQL, migraciones aplicadas y `npm run auth:env`. Las fases funcionales
agregarán pruebas de sus reglas críticas. Ejecutar `npm run test:security` ante cambios de guards,
roles, consultas acotadas por propiedad, cuotas o parsing HTTP; las pruebas de aislamiento usan PostgreSQL.
Para la frontera HTTP ejecutar también `npm run test:boundary`, con patzishop_test preparado;
comprueba rutas privadas, origen, tipos, caché y DTO. La suite completa ya lo incluye.
Para cambios en tiendas ejecutar `npm run test:businesses`: usa PostgreSQL real y elimina solo
sus propias fixtures. Los contratos y límites del módulo están en [businesses.md](businesses.md).
Para cambios de categorías o seed ejecutar `npm run test:categories`; verifica permisos ADMIN,
visibilidad pública y conservación de ediciones con PostgreSQL real. Contratos en [categories.md](categories.md).
Para cambios de productos, stock o imágenes ejecutar `npm run test:products`; las fixtures incluyen
archivos locales y se limpian sin borrar uploads ajenos. Contratos en [products.md](products.md).
Para cambios del catálogo público ejecutar también `npm run test:marketplace`; comprueba
filtros y visibilidad comercial con PostgreSQL. Contratos en [marketplace.md](marketplace.md).
Para cambios de carrito ejecutar `npm run test:cart`; valida propiedad, stock, cantidades,
totales y concurrencia. Contratos en [cart.md](cart.md).
Para entrega, revisión o contratos de pago ejecutar `npm run test:checkout`, además de la regresión
de carrito. No usar direcciones, tarjetas ni cuentas reales en fixtures. Contratos en [checkout.md](checkout.md).
Para confirmación, consultas de pedidos o inventario de compra ejecutar `npm run test:orders`,
además de checkout, carrito, productos y seguridad. Cubre idempotencia, concurrencia y rollback
con PostgreSQL real. Contratos en [orders.md](orders.md).
Para el panel vendedor ejecutar `npm run test:seller-dashboard` y la regresión de productos,
negocios, seguridad y pedidos; los importes deben usar solo subtotales del negocio autenticado.
Contratos y métricas en [seller-dashboard.md](seller-dashboard.md).
Para transiciones, historial o cancelaciones ejecutar `npm run test:order-transitions`, además de
pedidos, checkout, carrito, productos, panel vendedor, negocios, seguridad, API y base de datos.
Comprueba estados esperados, aislamiento, carreras y reposición única con PostgreSQL real.
Contratos en [order-management.md](order-management.md).
Para métricas globales, revisión de tiendas o aprovisionamiento ADMIN ejecutar `npm run test:admin`,
además de negocios, productos, marketplace, pedidos, transiciones, panel vendedor, checkout,
carrito, autenticación, seguridad, API y base de datos. No usar cuentas ni credenciales reales en fixtures.
Los importes globales usan subtotales no cancelados por método y no representan cobros.
Contratos y acceso inicial en [admin-dashboard.md](admin-dashboard.md).
Para cambios en frontend ejecutar `npm run test:frontend` y `npm run build:frontend`, además de
comprobar el flujo afectado con la API real y revisar escritorio/móvil. Usar solo fixtures propias
en la base local y eliminarlas después; nunca guardar cuentas, cookies o credenciales en capturas.

El propietario autorizó publicar el proyecto y guardar los avances mediante commits frecuentes.
Para cambios en Docker ejecutar `stack:env`, `stack:up`, `stack:seed` y `stack:check`, además de check.
Verificar contexto sin archivos privados, migraciones, salud y conservación de datos al recrear;
usar únicamente fixtures propias. CI incluye un job de contenedores. Guía en [Docker](docker.md).

Para una unidad de trabajo, seleccionar explícitamente sus archivos y revisar el contenido preparado:

```powershell
git add ruta/al/archivo
git diff --cached --stat
git diff --cached --check
git commit -m "tipo: describe the completed change"
git fetch origin
git status --short --branch
git push origin main
```

No versionar secretos, `.env`, dependencias, compilados ni imágenes temporales.
Si se usa una rama de trabajo, sustituir `main` por su nombre al publicar.
