# Documentación de PatziShop

Empezar por [instalación](installation.md), elegir desarrollo o stack Docker y leer [seed](seed.md)
antes de crear cuentas. Las guías describen comportamiento implementado; el despliegue público
se abordará en fase 22. El historial de comprobaciones permanece en [CHANGELOG](../CHANGELOG.md).

| Necesidad                                              | Guía                                                                                    |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Instalar un checkout y solucionar problemas iniciales  | [Instalación](installation.md)                                                          |
| Arrancar el stack, certificados, variables y volúmenes | [Docker](docker.md)                                                                     |
| Operar PostgreSQL de desarrollo                        | [Base de datos](database.md)                                                            |
| Generar cliente y aplicar migraciones                  | [Prisma](prisma.md)                                                                     |
| Comprender datos iniciales y fixtures                  | [Seed](seed.md)                                                                         |
| Consultar endpoints, autenticación y errores           | [Referencia API](api.md), [backend](backend.md), [auth](auth.md)                        |
| Revisar permisos, límites y hallazgos corregidos       | [Seguridad](security.md), [revisión](security-review.md)                                |
| Entender estructura y decisiones                       | [Arquitectura](architecture.md), [decisiones](decisions.md), [modelo ER](data-model.md) |
| Revisar versiones y compatibilidad                     | [Tecnologías](technology.md)                                                            |
| Ver la aplicación con datos ficticios                  | [Capturas](screenshots.md)                                                              |
| Ejecutar pruebas y verificar CI                        | [Testing](testing.md)                                                                   |
| Contribuir y publicar unidades verificadas             | [Contribución](contributing.md)                                                         |
| Consultar etapas completadas y pendientes              | [Roadmap](roadmap.md)                                                                   |

## Flujos de aplicación

| Flujo                                    | Contratos y comprobaciones                |
| ---------------------------------------- | ----------------------------------------- |
| Rutas React y sesión                     | [Frontend](frontend.md)                   |
| Tiendas                                  | [Negocios](businesses.md)                 |
| Categorías administrativas/públicas      | [Categorías](categories.md)               |
| Productos, stock e imágenes              | [Productos](products.md)                  |
| Catálogo, filtros, tienda y detalle      | [Marketplace](marketplace.md)             |
| Carrito multi-tienda                     | [Carrito](cart.md)                        |
| Entrega y revisión de compra             | [Checkout](checkout.md)                   |
| Confirmación, recibos e idempotencia     | [Pedidos](orders.md)                      |
| Estados, atención y cancelaciones        | [Gestión de pedidos](order-management.md) |
| Métricas propias y gestión comercial     | [Panel vendedor](seller-dashboard.md)     |
| Métricas globales, revisión y alta ADMIN | [Panel administrador](admin-dashboard.md) |

`npm run docs:check` verifica destinos de enlaces locales e imágenes y referencias a scripts root
en README, CHANGELOG y docs. No comprueba enlaces externos, anchors, credenciales ni el resultado
de ejecutar comandos. Forma parte de `npm run check` y de CI; las pruebas funcionales se ejecutan aparte.

## Comprobación de fase 21

Revisión del 2026-10-26 contra código, configuración y aplicación real:

| Área            | Evidencia                                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Instalación     | Instrucciones separadas para desarrollo y stack; builds y comandos de preparación comprobados en fases anteriores y CI  |
| API             | Las 48 operaciones se contrastaron con OpenAPI generado por AppModule; descripción Swagger actualizada                  |
| Seed            | Código de upsert revisado y ejecutado en base vacía exclusiva; solo categorías, sin credenciales                        |
| Capturas        | Seis JPEG reales revisados; cuentas ficticias, placeholders e importes de muestra explícitos                            |
| Móvil           | Observación de ancho sin desborde horizontal; exportación de imagen fallida documentada en la galería                   |
| Limpieza        | Sesiones cerradas, base exclusiva eliminada, credenciales temporales retiradas y servidores propios detenidos           |
| Documentación   | Enlaces/imágenes locales y scripts root comprobados automáticamente; no se declaran anchors o URLs externas verificados |
| Regresión local | 202 pruebas backend aprobadas, conteos de trece tablas conservados y TypeScript/check correctos                         |

La [ejecución remota](https://github.com/joshi20022021/MARKETPLACE_PATZISHOP/actions/runs/40327978922)
del commit b31c317 aprobó verify y containers: instalación limpia, auditoría, documentación,
las 323 pruebas, builds y stack HTTPS con migraciones y seed. El cierre documental se publica
después de esa comprobación; cada push vuelve a ejecutar CI.
Fase 21 completada. No se cambió el esquema, seed, permisos, pagos ni dependencias;
el despliegue público sigue pendiente de fase 22.
