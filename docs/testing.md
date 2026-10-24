# Testing — fase 19

Consolida pruebas unitarias, integración PostgreSQL, recorridos HTTP y componentes React.
La fase 18 (revisión integral de validaciones y seguridad) sigue pendiente: no queda completada
por ejecutar esta etapa fuera de orden. No cambia funcionalidad, esquema, seed ni dependencias.

## Preparación local

Después de instalar dependencias y preparar backend/.env según [base de datos](database.md):

```powershell
npm run db:up
npm run prisma:generate
npm run test:prepare
npm run test:migrate
npm test
```

`test:prepare` deriva una conexión local a la base fija `patzishop_test` desde backend/.env y
crea backend/.env.test, ignorado por Git. Retira parámetros de la URL de desarrollo y no copia
otras variables. Crea la base si falta, no la resetea, no borra datos ni sobrescribe una conexión
existente distinta. Exige el mismo propietario si la base ya existe. Requiere permisos locales
para crear bases; el usuario de Docker del proyecto los tiene. No se imprime la contraseña.
`test:migrate` aplica las migraciones existentes a ese destino. No aplica seed de demostración.

El runner exige `patzishop_test` en localhost/127.0.0.1/::1, sin query ni fragmento. No usa
DATABASE_URL de desarrollo como alternativa. TEST_DATABASE_URL prevalece sobre backend/.env.test;
permite configurar explícitamente el servicio local de CI. No sirve para probar una base remota.
No ejecutar dos suites contra la misma base simultáneamente.

Las pruebas de imágenes siguen usando fixtures locales propias, que limpian al terminar.
Los comandos individuales históricos `test:orders`, `test:products`, etc. conservan su entorno
anterior: para aislamiento y verificación completa usar los comandos consolidados siguientes.

## Comandos

| Comando                 | Cobertura                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| `npm test`              | Runner, todos los archivos backend y toda la suite React                                     |
| `npm run test:backend`  | Todos los archivos backend, compilados una vez                                               |
| `npm run test:unit`     | Guardas del entorno de pruebas, configuración, pagos y política de estados, sin conexión SQL |
| `npm run test:journey`  | Dos recorridos completos HTTP con PostgreSQL y controles reales                              |
| `npm run test:frontend` | Contratos, rutas, sesión, formularios, permisos, errores y recuperación en jsdom             |

La compilación descubre archivos `.test.ts` actuales en backend/test y ejecuta sus salidas ordenadas
secuencialmente, sin glob del shell ni archivos obsoletos de compilaciones previas. El primer fallo
produce código distinto de cero; no hay reintentos para ocultar fallos. Se generan un secreto JWT
efímero y valores de test consistentes por ejecución. No se necesitan servidores en 3000/5173.

El runner comprueba antes/después los conteos de trece tablas de cuentas, comercio, inventario,
carrito y sesiones. Deben conservarse incluso al fallar una prueba. No borra automáticamente residuos.
Las pruebas SQL usan rollback; las HTTP eliminan sus propios IDs/correos. La suite de categorías
puede asegurar las ocho categorías base del seed, por eso Category se excluye del conteo global.

## Recorridos críticos

Se ejecutan contra AppModule, sin sustituir guards, pagos ni servicios de dominio:

1. Aprovisionamiento ADMIN local y login HTTP; alta HTTP de dos vendedores y dos clientes.
2. Categoría administrativa, tienda PENDING y producto inactivo; publicación rechazada antes de aprobación.
3. Aprobación ADMIN con versión y publicación de ambos vendedores; carrito multi-tienda.
4. Rotación de sesión real, revisión y confirmación con contra entrega o simulación.
5. Repetición de confirmación y recuperación sin duplicar compras ni descuentos.
6. Aislamiento del cliente/vendedor ajeno; suspensión de una tienda tras comprar y atención hasta entrega.
7. Cancelación parcial repetida, restitución única, totales históricos y pago conservados.
8. Inventario, movimientos, historial y métricas propios; logout invalida acceso al recibo.

Son E2E de API HTTP y PostgreSQL, no automatización de navegador. Los 120 tests React usan
adaptadores simulados; las verificaciones visuales de fases anteriores siguen registradas en
[frontend](frontend.md). No se declara cobertura porcentual: no se ha instrumentado un reporte.

## Integración continua

`.github/workflows/tests.yml` prepara PostgreSQL 17 efímero y ejecuta instalación limpia, generación
Prisma, migraciones de test, check, suite completa y ambos builds. No publica una aplicación,
no usa credenciales de producción y solo solicita lectura del repositorio. Las acciones se fijan
por SHA; referencias oficiales: [checkout](https://github.com/actions/checkout) y
[setup-node](https://github.com/actions/setup-node). Corre en push a main, pull request o ejecución manual.
El resultado remoto se registrará después de publicar el workflow; el estado local no demuestra CI verde.

## Estado de comprobación

Pruebas unitarias y los dos recorridos HTTP correctos con la base aislada. La suite consolidada,
builds y verificación final se registrarán al cerrar la fase.
