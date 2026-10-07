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

Fases 1–5 completadas. La fase 5 añade registro, login, perfil protegido, rotación de refresh
y logout, verificados con PostgreSQL real. La siguiente etapa es fase 6 (RBAC y seguridad);
solo se iniciará por petición. Consulta [autenticación](auth.md) y [CHANGELOG](../CHANGELOG.md).
