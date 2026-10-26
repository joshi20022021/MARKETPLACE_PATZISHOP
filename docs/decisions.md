# Decisiones de arquitectura

Estas decisiones describen la implementación disponible hasta fase 21. El historial de fases
permanece en [CHANGELOG](../CHANGELOG.md); el modelo está en [data-model.md](data-model.md).

| Decisión                                              | Motivo y consecuencia                                                                                                      |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Monolito modular NestJS y SPA React en npm workspaces | Comparte herramientas y contratos por dominio sin introducir despliegues de microservicios; ambos se compilan por separado |
| PostgreSQL y Prisma con adaptador pg                  | Relaciones, decimales, restricciones SQL y transacciones; el cliente se genera y no se versiona                            |
| Migraciones SQL revisadas                             | CHECK y reglas que Prisma Schema no expresa; deploy instala el historial sin reset ni shadow database                      |
| Pedido global con subpedidos por negocio              | Cliente ve la compra completa; cada vendedor solo sus líneas, entrega necesaria y subtotal histórico                       |
| Precios y disponibilidad releídos al confirmar        | El cliente no autoriza importes ni reserva stock; preview no descuenta inventario                                          |
| Idempotencia por cliente/intento                      | Recupera confirmaciones inciertas sin duplicar pedidos ni inventario; payload distinto con la misma clave se rechaza       |
| Bloqueos transaccionales y estado esperado            | Serializa inventario, revisión y cancelaciones; evita decisiones obsoletas y restitución duplicada                         |
| Snapshots de entrega y líneas                         | Cambios posteriores en catálogo no alteran el recibo; no borrar productos usados en pedidos                                |
| Roles exactos sin herencia ADMIN                      | Administración usa endpoints propios; permisos y propiedad permanecen en las consultas de negocio                          |
| JWT en memoria y refresh HttpOnly                     | Evita persistir tokens en storage; servidor revalida actividad, rol y familia de sesión                                    |
| Origen explícito y cabecera CSRF                      | Solo CORS_ORIGIN concede confianza a POST auth con Origin; Host/Forwarded no amplían acceso                                |
| Respuestas API no-store                               | Reduce almacenamiento accidental de datos privados, incluidos rechazos previos a controllers                               |
| Imágenes locales normalizadas con Sharp               | UUID opaco, WebP y límites de bytes/píxeles; datos y BD deben respaldarse juntos, sin middleware estático de uploads       |
| Contra entrega y pago simulado                        | Permite verificar la compra sin integrar cobros externos; importes simulados no representan ingresos reales                |
| Seed limitado a categorías                            | Inicio repetible sin contraseñas conocidas ni elevación automática de usuarios                                             |
| Base de pruebas fija y separada                       | El runner rechaza destinos de desarrollo/remotos y comprueba conservación de fixtures; React usa adaptadores simulados     |
| Docker multietapa y HTTPS local                       | Compila binarios para Linux y conserva cookies Secure; el proxy unifica origen sin publicar BD/API                         |
| Entornos Docker y desarrollo separados                | Evita compartir secretos/volúmenes accidentalmente; los datos no se sincronizan entre ambos                                |

## Límites y decisiones aún abiertas

El storage de imágenes y el rate limiter son locales; el último vive en memoria por proceso.
El stack no confía en encabezados de proxy, por lo que sus clientes comparten cuota de IP.
Antes de publicar o añadir réplicas hay que definir proxy confiable, almacenamiento compartido,
TLS de dominio, secretos operativos, backup/restauración y observabilidad. Es trabajo de fase 22,
no una garantía implícita por tener Docker. El certificado de Caddy actual pertenece a una CA local.

No hay proveedor de pagos, webhooks, reembolsos, reviews, favoritos, delivery ni facturación.
La administración no incorpora gestión general de usuarios, edición global de pedidos ni una
pantalla de categorías; estas últimas sí tienen API ADMIN. No hay una tarea de limpieza programada
del historial de refresh. Los límites revisados están en [seguridad](security-review.md).

Las capturas documentan estados concretos con fixtures, no cobertura porcentual ni un entorno
de producción. Las pruebas HTTP de recorridos son E2E de API/PostgreSQL; las React son jsdom,
distintas de las verificaciones manuales de navegador registradas en [frontend](frontend.md).
