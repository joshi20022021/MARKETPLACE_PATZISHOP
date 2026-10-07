# PostgreSQL local con Docker Compose

La fase 2 añadió infraestructura de desarrollo. La fase 3 incorpora las entidades y migraciones
Prisma: consulta [el modelo de datos](data-model.md) y [la guía de Prisma](prisma.md).

## Decisiones

- Imagen oficial `postgres:17.11-alpine`, con versión explícita y sin etiqueta `latest`.
- Servicio `postgres`, proyecto Compose `patzishop` y volumen administrado `postgres_data`.
- Persistencia en `/var/lib/postgresql/data`, ruta correspondiente a PostgreSQL 17.
- Puerto publicado únicamente en `127.0.0.1`; no se expone a la red local.
- Credenciales obligatorias mediante `.env` de la raíz, ignorado por Git.
- Autenticación TCP SCRAM-SHA-256 y healthcheck con `pg_isready`.
- El usuario generado por la imagen es administrador de esta BD local. La separación de roles de
  migraciones y aplicación se diseñará para despliegue; no son credenciales de producción.

Referencias: [imagen oficial](https://hub.docker.com/_/postgres) y
[interpolación de variables en Compose](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/).

## Inicio

Docker Desktop debe estar iniciado y utilizar contenedores Linux. Desde la raíz:

```powershell
docker --version
docker compose version
docker info
npm run db:env
docker compose config --quiet
npm run db:up
npm run db:check
docker compose ps
```

`db:env` crea `.env` desde la plantilla con 32 bytes aleatorios codificados en hexadecimal.
Nunca imprime la contraseña y no sobrescribe un archivo existente. Si ya copiaste la plantilla
manualmente, completa `POSTGRES_PASSWORD` antes de iniciar.
`config --quiet` valida la configuración sin imprimir las credenciales interpoladas.

`db:up` espera hasta que PostgreSQL esté saludable. `db:check` ejecuta SQL por TCP dentro
del contenedor con contraseña y muestra la base, usuario y versión. Debe terminar con `FASE 2 OK`.
Este comando comprueba autenticación real; el healthcheck por sí solo solo indica disponibilidad.
`npm run check` sigue comprobando el repositorio sin depender de una BD activa.

## Variables y conexión

| Variable raíz     | Propósito                | Valor de la plantilla |
| ----------------- | ------------------------ | --------------------- |
| POSTGRES_DB       | Base inicial             | patzishop             |
| POSTGRES_USER     | Usuario local inicial    | patzishop             |
| POSTGRES_PASSWORD | Contraseña privada       | Vacío; generar        |
| POSTGRES_PORT     | Puerto publicado al host | 5432                  |

Para un cliente SQL instalado en Windows: host `127.0.0.1`, puerto `POSTGRES_PORT` y los valores
privados de `.env`. La contraseña se introduce desde el archivo local, no se guarda en documentación.
La conexión TCP interna del verificador no comprueba el puerto publicado en Windows;
puedes comprobarlo con `Test-NetConnection 127.0.0.1 -Port 5432`.

El futuro backend local usará `127.0.0.1:POSTGRES_PORT`; un backend dentro del mismo Compose
usará `postgres:5432`. `npm run db:backend-env` prepara `DATABASE_URL` en `backend/.env`.
El `.env` raíz configura Docker y es independiente de los entornos de frontend y backend.

En el equipo de desarrollo actual se usa `POSTGRES_PORT=5433` porque 5432 ya está ocupado.
La plantilla conserva 5432; consulta tu `.env` al configurar un cliente SQL.

## Verificación realizada en esta etapa

Se comprobó PostgreSQL saludable, SQL autenticado, acceso al puerto local 5433 y persistencia
de un dato temporal después de eliminar y recrear el contenedor con `db:down` y `db:up`.
La tabla usada para la comprobación se eliminó al terminar. También se comprobó que Compose
rechaza una contraseña vacía y que el generador no modifica un `.env` existente.

## Operación cotidiana

```powershell
npm run db:logs
docker compose restart postgres
npm run db:up
npm run db:check
npm run db:down
```

`db:down` elimina contenedor y red conservando el volumen; al volver a ejecutar `db:up`,
los datos continúan disponibles. No se agrega un comando de reinicio que elimine datos.
La opción `docker compose down --volumes` sí elimina el volumen y los datos: no usarla para detener
el entorno habitualmente.

La imagen inicializa usuario, contraseña y base solo cuando el volumen está vacío. Cambiar `.env`
después de crear la BD no modifica las credenciales existentes: realiza el cambio correspondiente
en PostgreSQL y luego actualiza la configuración de clientes.

## Solución de problemas

- Motor detenido: inicia Docker Desktop; `docker desktop start` también está disponible en esta instalación.
- Motor Windows: selecciona el motor Linux en Docker Desktop.
- Puerto ocupado: cambia `POSTGRES_PORT` en `.env` (por ejemplo a 5433) y ejecuta `db:up`.
  Actualiza también el puerto de tus clientes SQL.
- Contraseña requerida: completa `POSTGRES_PASSWORD` o genera `.env` antes del primer arranque.
- Fallo de descarga: comprueba la conexión a Docker Hub y repite `db:up`.
- Contenedor no saludable: consulta `db:logs`; no borres el volumen para ocultar el error.

No compartir la salida completa de `docker compose config` o `docker inspect` sin revisar secretos.
