# Stack Docker completo — fase 20

El stack local contiene PostgreSQL, migraciones Prisma, API NestJS de producción y React compilado
servido por Caddy. Solo publica HTTPS en loopback; no publica PostgreSQL ni la API directamente.
No utiliza las bases, secretos ni uploads del entorno de desarrollo de `docker-compose.yml`.

## Arranque

Requiere Docker Engine con contenedores Linux y Docker Compose v2, sin Node instalado en el host
para los comandos Docker. Los atajos npm y la verificación usan Node 22/npm 10.

```powershell
npm run stack:env
npm run stack:up
npm run stack:seed
npm run stack:check
npm run stack:ps
```

`stack:env` crea docker/.env con contraseña y secreto JWT aleatorios, sin mostrarlos ni sobrescribir
un archivo existente. No reutilizar secretos de desarrollo. La plantilla es docker/.env.example.
Usar valores alfanuméricos para usuario/base y contraseña hexadecimal generada: DATABASE_URL se
construye por interpolación y caracteres reservados necesitan codificación URI.

`stack:up` compila las imágenes y espera salud. PostgreSQL debe estar saludable antes de migrar;
la API solo arranca tras `prisma migrate deploy` exitoso. No ejecuta migrate dev, reset ni seed
automático. El seed explícito asegura categorías sin sobrescribir ediciones y no crea credenciales.
Un fallo de migración bloquea el arranque: revisar logs y corregir la causa sin borrar volúmenes.

Abrir **https://localhost:8443**. Caddy usa una CA local persistente; el navegador debe confiar en
su certificado raíz para evitar el aviso de certificado. `stack:check` exporta únicamente el
certificado público a tmp/patzishop-root.crt y lo usa como CA para verificar TLS, sin desactivar
verificación de certificados. Su instalación en el almacén de confianza del usuario es manual;
no importar claves privadas. El nombre localhost debe coincidir con el certificado.

Los contenedores utilizan NODE_ENV=production y cookies Secure/HttpOnly/SameSite=Strict.
Frontend y API comparten origen; `/api/*` se reenvía sin retirar el prefijo y las rutas React
directas reciben index.html. Swagger permanece deshabilitado. Cambiar HTTPS_PORT en docker/.env
ajusta listener, puerto publicado y CORS_ORIGIN. APP_HOST permite otro nombre, pero debe resolver
a loopback; el verificador automático exige localhost. VITE_API_URL se fija a /api/v1 al compilar;
no contiene secretos ni necesita conocer el hostname del contenedor backend.

## Imágenes y persistencia

- Backend: build con npm ci, generación Prisma y Nest; runtime separado con dependencias de producción,
  usuario node y señal de cierre mediante init. El target tools añade fuentes y tsx para migrar,
  seed y aprovisionamiento. npm conserva Prisma/TypeScript como peers opcionales del cliente en runtime;
  Nest CLI, Vite y tsx no forman parte de ese runtime.
- Frontend: build Vite separado del servidor Caddy, ejecutado como UID 1000.
- Bases Node 22 y Caddy fijadas por digest; actualizar explícitamente y repetir la verificación.
- Contexto de build por lista permitida en .dockerignore: excluye .env, Git, uploads, pruebas locales,
  node_modules y cliente Prisma del host. Los binarios nativos se instalan para Linux en el build.
- Volúmenes separados postgres_data, product_images, caddy_data y caddy_config bajo patzishop-stack.
  Datos, imágenes y CA sobreviven a recreaciones y a `stack:down`.

```powershell
npm run stack:logs
npm run stack:down
npm run stack:up
```

No usar down -v para actualizar: elimina los datos del stack. Las copias deben incluir PostgreSQL,
imágenes y la CA con sus claves privadas; no se versionan. Las variables de PostgreSQL inicializan
un volumen vacío: cambiar la contraseña en el archivo no cambia un usuario ya persistido.

Comandos equivalentes sin los atajos npm:

```powershell
docker compose --env-file docker/.env -f compose.stack.yml up -d --build --wait --wait-timeout 180
docker compose --env-file docker/.env -f compose.stack.yml run --rm migrate ../node_modules/.bin/prisma db seed
```

Para aprovisionar ADMIN usar el servicio migrate con `npm run admin:create` y variables
PATZISHOP_ADMIN_NAME/EMAIL/PASSWORD privadas, según [administración](admin-dashboard.md).
Nunca pasar contraseñas literales al historial del shell; usar variables de entorno y `run -e NOMBRE`.
Ejecutar seed y aprovisionamiento en migrate, donde están las fuentes y tsx.

## Comprobaciones y límites

`stack:check` verifica HTTPS con la CA local, SPA con rutas directas, readiness SQL, proxy,
Swagger deshabilitado y accesos privados. Crea una cuenta ficticia, comprueba registro, perfil,
carrito, cookie Secure, rotación y revocación; elimina únicamente su cuenta y sesiones al terminar.
No imprime tokens, cookies ni secretos. Es una prueba contra los contenedores reales; complementa
las 323 pruebas de [testing](testing.md), no representa automatización de navegador.

La verificación local y CI se registran al cerrar esta fase. El frontend de producción no usa
el servidor de desarrollo Vite. Las migraciones no se ejecutan al construir imágenes.

Este stack es local. El despliegue público corresponde a fase 22: dominio/TLS público, copias y
restauración operativa, observabilidad y secretos del proveedor. Express conserva trust proxy
desactivado: las cuotas por IP ven al proxy y se comparten entre clientes del stack. No confiar
indiscriminadamente en Forwarded/X-Forwarded-For; la configuración de proxies confiables y un
limiter compartido deben definirse antes de publicar o añadir réplicas.

Referencias: [builds por etapas](https://docs.docker.com/build/building/multi-stage/),
[orden de arranque Compose](https://docs.docker.com/compose/how-tos/startup-order/) y
[HTTPS local en Caddy](https://caddyserver.com/docs/automatic-https#local-https).
