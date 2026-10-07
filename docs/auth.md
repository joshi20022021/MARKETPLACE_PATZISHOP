# Autenticación — fase 5

La API permite registro CUSTOMER o SELLER, login, perfil autenticado, renovación y logout.
El registro público rechaza ADMIN. AuthModule contiene los flujos HTTP y sesiones;
UsersModule consulta las credenciales y solo publica id, nombre, correo y rol.
No hay reglas RBAC de negocio todavía: se implementarán en la fase 6.

## Preparación

Desde la raíz, después de preparar PostgreSQL y aplicar la migración inicial:

```powershell
npm run db:backend-env
npm run auth:env
npm run db:up
npm run dev:backend
```

`auth:env` completa JWT_ACCESS_SECRET vacío en backend/.env con 32 bytes aleatorios codificados
en hexadecimal. Conserva un secreto existente y las demás variables; no imprime credenciales.
Para otra instalación usa un secreto distinto. El entorno exige entre 64 y 512 caracteres
sin espacios; no mide la entropía de un secreto introducido manualmente.
JWT_ACCESS_TTL acepta segundos, minutos u horas (`30s`, `15m`, `1h`), hasta 3600 segundos.
REFRESH_TOKEN_TTL_DAYS acepta 1 a 30 días; el valor predeterminado es siete.
No se necesita una migración adicional: User y RefreshToken ya existen desde la fase 3.

## Contratos HTTP

Base: `/api/v1/auth`. Todos los POST exigen `X-PatziShop-CSRF: 1`.

| Método | Ruta      | Entrada                              | Resultado                                         |
| ------ | --------- | ------------------------------------ | ------------------------------------------------- |
| POST   | /register | name, email, password, role opcional | 201, acceso JWT y usuario público; cookie refresh |
| POST   | /login    | email, password                      | 200, acceso JWT y usuario público; cookie refresh |
| POST   | /refresh  | Cookie patzishop_refresh             | 200, nuevo acceso JWT; reemplaza la cookie        |
| POST   | /logout   | Cookie patzishop_refresh, si existe  | 204, revoca la familia y borra la cookie          |
| GET    | /me       | Authorization: Bearer accessToken    | 200, id, name, email y role actuales              |

El correo se recorta y convierte a minúsculas; el nombre se recorta. El registro admite nombre
de 2 a 120 caracteres, correo de hasta 254 y contraseña de al menos 12 caracteres y hasta
72 bytes UTF-8. La contraseña no se recorta. Login acepta contraseñas de 1 a 72 bytes.
Se rechazan propiedades extra en registro/login. Role omitido o null usa CUSTOMER;
los únicos valores explícitos aceptados son CUSTOMER y SELLER.

Registro, login y refresh responden:

```json
{
  "success": true,
  "accessToken": "<JWT>",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": { "id": "<UUID>", "name": "Cliente", "email": "cliente@example.test", "role": "CUSTOMER" }
}
```

El refresh token nunca se devuelve en JSON ni se acepta desde el cuerpo. Todas las respuestas
de auth llevan Cache-Control: no-store y Pragma: no-cache, incluidos errores.
Los errores mantienen el formato global de la API: 400 VALIDATION_ERROR, 409 EMAIL_ALREADY_EXISTS,
401 INVALID_CREDENTIALS para login, 401 INVALID_SESSION o UNAUTHORIZED para sesiones/JWT,
y 403 CSRF_REJECTED para encabezado u origen inválidos. Logout sin cookie es idempotente.

## Sesiones y protección

Contraseñas: bcrypt con coste 12; el límite de bytes evita su truncamiento silencioso.
Login compara un hash ficticio para correos inexistentes y comparte el mensaje de credenciales
incorrectas con contraseñas erróneas y cuentas inactivas.

Access JWT: HS256, emisor patzishop, audiencia patzishop-web, sub (usuario), sid (familia)
y tokenUse=access. Passport exige firma, algoritmo, emisor, audiencia y vencimiento válidos.
El guard consulta PostgreSQL en cada petición protegida: necesita usuario activo y un refresh
vigente sin revocación en esa familia. Así logout, reutilización e inactivación rechazan
las siguientes peticiones incluso con JWT no vencido. El rol proviene de la BD; no del token.
La verificación depende de que PostgreSQL esté disponible y no cancela peticiones ya autorizadas.

Refresh: 32 bytes aleatorios base64url; PostgreSQL conserva únicamente SHA-256, familia,
vencimiento, revocación y vínculo al reemplazo. Cada login crea una familia independiente.
La rotación mantiene el vencimiento absoluto original y limita el JWT a la vida restante.
Se conserva el historial revocado para detectar reutilización; no existe todavía una tarea de
limpieza programada. La revocación se confirma antes de devolver el error al cliente.

Un bloqueo transaccional de PostgreSQL por familia serializa refresh y logout. Usar de nuevo
un token revocado, vencido o de usuario inactivo revoca todos los refresh activos de su familia.
Dos renovaciones simultáneas con la misma cookie producen una renovación y un rechazo que
revoca la familia completa. El futuro frontend debe coordinar una única renovación en vuelo
entre solicitudes y pestañas, y volver al login si recibe 401.

Cookie patzishop_refresh: HttpOnly, SameSite=Strict, Path=/api/v1/auth, sin Domain y con
vencimiento absoluto. Secure se activa en production, que requiere HTTPS. El borrado conserva
el mismo alcance. Frontend y API deben compartir sitio para SameSite=Strict; durante desarrollo
usa localhost para ambos o 127.0.0.1 para ambos, con CORS_ORIGIN acorde. Si se despliegan en sitios
distintos habrá que definir y verificar una política de cookies adecuada en la fase de despliegue.

Los POST auth exigen el encabezado personalizado y rechazan Origin cuando no coincide con
CORS_ORIGIN ni con el origen de la API. Origin=null se rechaza. Clientes de consola sin Origin
pueden usarlos con el encabezado. CORS permite credenciales únicamente para el origen configurado.
Este mecanismo utiliza encabezado y origen; no hay un token CSRF secreto de sincronización.

## Probar en Swagger y PowerShell

Abre http://127.0.0.1:3000/api/docs, registra un usuario y proporciona el encabezado 1.
Copia accessToken a Authorize (Bearer) para /me. El navegador recibe y envía la cookie HttpOnly
en refresh/logout; no intentes leerla desde JavaScript. Mantén el mismo host durante el flujo.
No existe cuenta ADMIN ni contraseña de demostración en el seed.

En PowerShell puedes conservar la cookie con una WebSession:

```powershell
$authBase = 'http://127.0.0.1:3000/api/v1/auth'
$authHeaders = @{ 'X-PatziShop-CSRF' = '1' }
$authEmail = Read-Host 'Correo de una cuenta registrada'
$authPassword = Read-Host 'Contraseña' -AsSecureString
$authLogin = @{ email = $authEmail; password = [System.Net.NetworkCredential]::new('', $authPassword).Password } | ConvertTo-Json
$authResult = Invoke-RestMethod "$authBase/login" -Method Post -Headers $authHeaders -ContentType 'application/json' -Body $authLogin -SessionVariable authSession
Invoke-RestMethod "$authBase/me" -Headers @{ Authorization = "Bearer $($authResult.accessToken)" }
$authResult = Invoke-RestMethod "$authBase/refresh" -Method Post -Headers $authHeaders -WebSession $authSession
Invoke-RestMethod "$authBase/logout" -Method Post -Headers $authHeaders -WebSession $authSession
```

## Verificación

`npm run test:auth` compila con metadata de TypeScript y ejecuta trece pruebas con Nest Testing,
Supertest y PostgreSQL real. Cubren registro/roles, normalización, bcrypt, cookies, login,
duplicados concurrentes, JWT inválidos, rotación, reutilización, logout, sesiones independientes,
vencimiento, inactivación, perfil actual, CSRF y OpenAPI. Las cuentas tienen correos UUID y se
eliminan al terminar; sus sesiones se borran por cascada. No se borran datos ajenos al test.
`npm run test:api` cubre también el entorno auth. Mantener las pruebas SQL de la fase 3.
También se verificó npm ci seguido de generación Prisma, typecheck, build y auth; el proceso
compilado en production emitió cookie Secure, protegió el perfil, revocó acceso al cerrar sesión
y mantuvo Swagger oculto. La cuenta temporal y el proceso de comprobación se eliminaron al terminar.

Rate limiting y permisos de negocio corresponden a la fase 6. Recuperación de contraseña,
verificación de correo, OAuth y un panel para administrar sesiones quedan fuera de esta etapa.

Referencias: [Passport en NestJS](https://docs.nestjs.com/recipes/passport),
[límite de bcrypt](https://github.com/kelektiv/node.bcrypt.js#security-issues-and-concerns),
[rotación y detección de reutilización](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14.2),
[encabezados personalizados y origen para CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
