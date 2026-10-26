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
