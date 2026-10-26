# Desarrollo por etapas

La fase 1 prepara el repositorio. Cada fase posterior se implementará en una etapa explícita,
con comprobaciones antes de avanzar.

| Fase | Alcance                              | Criterio de comprobación previsto                          |
| ---- | ------------------------------------ | ---------------------------------------------------------- |
| 1    | Arquitectura y configuración inicial | npm ci y npm run check                                     |
| 2    | Docker + PostgreSQL                  | Compose válido, BD saludable y conexión SQL                |
| 3    | Prisma y modelo de datos             | ER explicado, esquema válido y migración aplicada          |
| 4    | Backend NestJS                       | API inicia, health y documentación accesibles              |
| 5    | JWT y refresh tokens                 | Registro, login, rotación y logout comprobados             |
| 6    | RBAC y seguridad                     | Rechazo de accesos por rol y propiedad incorrectos         |
| 7    | Negocios                             | Crear tienda y administrar solo la propia                  |
| 8    | Categorías                           | Gestión administrativa y consulta pública                  |
| 9    | CRUD de productos                    | Validación, propiedad, imágenes y paginación               |
| 10   | Frontend React                       | Build, rutas, formularios y conexión API                   |
| 11   | Marketplace público                  | Catálogo, filtros, tienda y detalle responsive             |
| 12   | Carrito                              | Cantidades, múltiples tiendas y totales                    |
| 13   | Checkout                             | Dirección y contratos de pago contra entrega/simulado      |
| 14   | Órdenes multi-vendedor               | División por tienda e inventario transaccional             |
| 15   | Dashboard vendedor                   | Métricas y CRUD conectados al negocio autenticado          |
| 16   | Gestión de pedidos                   | Estados válidos e historial por vendedor                   |
| 17   | Dashboard administrador              | Métricas globales y aprobación de tiendas                  |
| 18   | Validaciones y seguridad             | Revisión integral de entradas y controles implementados    |
| 19   | Testing                              | Unitarias, integración y E2E críticas reproducibles        |
| 20   | Dockerización completa               | Stack completo saludable con configuración externa         |
| 21   | Documentación                        | Instalación, API, seed, capturas y decisiones actualizadas |
| 22   | Deployment                           | Entorno definido y verificación de aplicación desplegada   |

Seguridad y pruebas críticas se añaden con cada módulo; las fases 18 y 19 consolidan la cobertura.
La fase 13 prepara la pantalla y el contrato del checkout; la compra completa se verifica en la 14.
No se consideran terminadas las funciones conectadas hasta comprobar su flujo real.

Después del MVP: pagos externos, reseñas, favoritos, notificaciones, delivery, facturación,
comisiones, planes y reportes. No se implementan en la configuración inicial.

## Estado actual

Fases 1–21 completadas. La fase 18 se revisó después de consolidar testing en la fase 19.
React ofrece sesión, formularios, marketplace, carrito, checkout e historial propio.
La fase 14 confirma compras con subpedidos por tienda, entrega histórica, inventario atómico,
idempotencia y recuperación de respuestas perdidas. Contra entrega queda pendiente; simulación
queda pagada como prueba, sin cobros reales. La revisión previa sigue sin reservar inventario.
La fase 15 conecta métricas y gestión de productos/imágenes al negocio autenticado desde el panel vendedor.
La fase 16 conecta estados e historial por tienda, cancelación temprana y reposición transaccional única.
La fase 17 conecta métricas globales y revisión de tiendas con aprobación, rechazo, suspensión y reactivación.
Incluye aprovisionamiento local de cuentas nuevas ADMIN, sin credenciales seed ni registro público de ese rol.
La fase 19 incorpora base de pruebas aislada, ejecución completa, unitarias y recorridos HTTP multi-vendedor.
La fase 18 revisa entradas, sesión, permisos, propiedad, archivos y dependencias, corrige los hallazgos
y añade regresión HTTP. Matriz y límites en [revisión de seguridad](security-review.md).
La fase 20 contiene el stack completo con imágenes Linux, migraciones, HTTPS local, volúmenes,
healthchecks y verificación de sesión a través del proxy. Operación y límites en [Docker](docker.md).
La fase 21 consolida instalación, las 48 operaciones API, seed, decisiones y seis capturas reales
con fixtures independientes. Comprueba enlaces locales y scripts desde check/CI; la exportación
de captura móvil falló y se documenta ese límite en la galería. Índice en [documentación](index.md).
La siguiente etapa es fase 22 (Deployment); no se inicia sin petición.
Pagos externos y las extensiones posteriores al MVP siguen pendientes.
Consulta [frontend](frontend.md) para ejecución, pruebas y límites de sesión.
Consulta [marketplace](marketplace.md) para rutas, filtros y comprobaciones de fase 11.
Consulta [carrito](cart.md) para contratos y comprobaciones de fase 12.
Consulta [checkout](checkout.md) para contratos y comprobaciones de fase 13.
Consulta [pedidos](orders.md) para contratos y comprobaciones de fase 14.
Consulta [panel vendedor](seller-dashboard.md) para contratos y comprobaciones de fase 15.
Consulta [gestión de pedidos](order-management.md) para contratos y comprobaciones de fase 16.
Consulta [panel administrador](admin-dashboard.md) para contratos y comprobaciones de fase 17.
Consulta [testing](testing.md) para comandos, cobertura y comprobaciones de fase 19.
Consulta [productos](products.md), [categorías](categories.md), [seguridad](security.md) y [CHANGELOG](../CHANGELOG.md).
