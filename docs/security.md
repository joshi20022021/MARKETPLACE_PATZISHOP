# Seguridad y autorización — fase 6

La API protege por defecto las rutas de controllers NestJS. `@Public()` es una excepción explícita:
salud, registro, login, refresh, logout, consulta pública de tiendas/categorías y media elegible admiten invitados.
El perfil y la gestión de la tienda propia siguen exigiendo Bearer JWT.
Swagger es middleware independiente de los guards; permanece desactivado por defecto en production.

## Roles

JwtAuthGuard es global y verifica primero la identidad, usuario activo y familia de sesión en BD.
RolesGuard aplica después `@Roles('ADMIN')`, `@Roles('SELLER')`, `@Roles('CUSTOMER')` o una lista
explícita. Los permisos del método reemplazan los del controller. ADMIN no hereda SELLER ni CUSTOMER.
Un endpoint sin Roles permite cualquier usuario autenticado; no permite invitados.
Combinar Public y Roles no concede permisos: el guard de rol rechaza la falta de identidad.

```typescript
@Controller('seller/products')
@Roles('SELLER')
export class SellerProductsController {
  // El CRUD se añadirá en la fase 9.
}
```

401 indica autenticación ausente o sesión inválida; 403 ROLE_FORBIDDEN indica rol incorrecto.
El rol siempre viene de PostgreSQL a través de la estrategia JWT. Cambiarlo o desactivar al usuario
afecta la siguiente solicitud aunque el JWT ya estuviera emitido. No hay endpoint público para ADMIN.

## Propiedad

SecurityModule exporta ResourceScopeService con predicados Prisma:

| Método         | Rol permitido         | Filtro                                 |
| -------------- | --------------------- | -------------------------------------- |
| sellerBusiness | SELLER                | ownerId = usuario autenticado          |
| sellerProduct  | SELLER                | business.ownerId = usuario autenticado |
| sellerOrder    | SELLER                | business.ownerId = usuario autenticado |
| customerOrder  | CUSTOMER              | customerId = usuario autenticado       |
| ownAddress     | Cualquier autenticado | userId = usuario autenticado           |

Los métodos de vendedor/cliente también rechazan roles incorrectos al llamarlos desde un service.
No toman un ownerId o businessId enviado por el cliente como prueba de pertenencia. Un ADMIN debe
usar endpoints administrativos explícitos; no obtiene una excepción dentro del ámbito de vendedor.
Se utiliza AND para conservar el predicado al añadir id, búsqueda u otros filtros.

```typescript
const product = await prisma.product.findFirst({
  where: { AND: [{ id }, scopes.sellerProduct(user)] },
  select: { id: true },
});
return scopes.requireFound(product);
```

Recursos ajenos e inexistentes producen el mismo 404 RESOURCE_NOT_FOUND para evitar revelar su
existencia. En escrituras el ámbito debe permanecer en la misma consulta, por ejemplo updateMany
o deleteMany. Comprobar propietario y luego actualizar únicamente por id deja una separación entre
la verificación y la operación. Usar transacciones cuando se añadan reglas que abarquen varias filas.

```typescript
const result = await prisma.product.updateMany({
  where: { AND: [{ id }, scopes.sellerProduct(user)] },
  data: { name },
});
// count=0 indica que no existe dentro de ese ámbito; responder 404.
```

Los módulos de negocio deben importar SecurityModule y aplicar estos filtros en sus operaciones.
BusinessesModule los consume desde la fase 7: ownerId viene de la identidad autenticada,
la actualización conserva el ámbito en la misma consulta y el DTO rechaza campos privilegiados.
La consulta pública filtra ACTIVE y propietario SELLER activo sin publicar ownerId ni estado.
Las reglas de aprobación de tiendas, transiciones de pedidos e inventario corresponden a sus fases.
Consulta [negocios](businesses.md) para las quince pruebas reales de estos endpoints.
La fase 8 aplica Roles ADMIN a todos los endpoints administrativos de categorías. El registro
no concede ADMIN y no se introduce una excepción para SELLER. La proyección pública excluye
estado, jerarquía y fechas; consulta solo categorías activas y rechaza filtros de visibilidad.
Las diecisiete pruebas de [categorías](categories.md) usan los guards globales y PostgreSQL real.
La fase 9 consume sellerProduct en lecturas y escrituras, conservando el filtro de propietario.
Los bloqueos de fila de producto serializan stock, imágenes y borrado; tienda y categoría se leen
con FOR SHARE al validar escrituras para coordinar cambios concurrentes. Se deniega editar productos
de tiendas SUSPENDED/REJECTED. La vista previa de imágenes exige identidad propia; la media pública
comprueba producto activo, stock positivo, categoría activa, tienda ACTIVE y propietario SELLER activo.
No hay middleware estático para uploads ni posibilidad de guardar rutas enviadas por el cliente.

## Pruebas

```powershell
npm run db:up
npm run auth:env
npm run test:security
```

Diez pruebas con PostgreSQL real comprueban roles exactos, rutas protegidas por defecto, excepciones
públicas, cambio de rol, inactivación, revocación, acceso entre vendedores/clientes, UUID inválidos,
parámetros manipulados y escrituras con filtros de propiedad. Los controllers `_security`, `_default`
y `_ownership` existen únicamente en los módulos de prueba: AppModule no los monta ni documenta.
Las fixtures se eliminan por sus IDs, respetando las claves foráneas; no se modifica información ajena.

## Límites de solicitudes y cuerpos

ApiThrottleGuard se ejecuta antes de JWT y roles, usando @nestjs/throttler 6.7.1.
La política está centralizada en `src/security/rate-limit.policy.ts`:

| Ámbito                     | Solicitudes por IP y handler en 60 segundos |
| -------------------------- | ------------------------------------------- |
| Rutas NestJS sin excepción | 120                                         |
| POST /auth/register        | 5                                           |
| POST /auth/login           | 10                                          |
| POST /auth/refresh         | 30                                          |
| POST /auth/logout          | 30                                          |

Se cuentan solicitudes exitosas y fallidas, incluidas las rechazadas por JWT, origen o DTO.
Al exceder el límite se devuelve 429 TOO_MANY_REQUESTS con Retry-After en segundos; el cliente
debe respetarlo antes de repetir. El bloqueo dura 60 segundos desde que se supera la cuota.
Los contadores de los handlers son independientes; variar IDs o query strings no los reinicia.
Salud/readiness quedan exentos para comprobaciones operativas; Swagger y rutas sin handler no
están cubiertos por el guard. Un JSON de más de 32 KiB se rechaza en middleware con 413
PAYLOAD_TOO_LARGE antes de llegar a guards o services; JSON malformado devuelve 400 sin reflejarlo.
Este límite se aplica a JSON. Desde la fase 9, la carga multipart de productos admite un archivo
de hasta 5 MiB, sin campos adicionales y hasta seis imágenes por producto. Formato, píxeles,
normalización, concurrencia y compensación se detallan en [productos](products.md).

La IP proviene de req.ip. Express conserva trust proxy desactivado; no se confía en X-Forwarded-For
enviado directamente. Throttler normaliza IPv4 y agrupa IPv6 por /64. Usuarios detrás de una misma
IP comparten cuota. El almacenamiento está en memoria por proceso y se reinicia al arrancar;
no es un límite distribuido. Antes de varias réplicas se necesitará un storage compartido, y
ante un proxy habrá que declarar sus direcciones confiables según la topología del despliegue.
No habilitar trust proxy indiscriminadamente para resolver una IP desconocida.

CORS expone Retry-After y X-RateLimit-Limit/Remaining/Reset al frontend autorizado. Swagger
documenta 429 en auth. La limitación de solicitudes complementa DTO, CORS, CSRF, Helmet y los
guards; no concede acceso ni reemplaza los filtros de propiedad.

Seis pruebas adicionales verifican cuotas reales, orden de guards, no invocación del servicio
al superar el límite, recuperación después del bloqueo, query/X-Forwarded-For manipulados,
salud, CORS, JSON grande y OpenAPI. Sustituyen AuthService para contar llamadas sin crear usuarios;
usan el guard y storage reales. Las pruebas de regresión auth desactivan solo el limiter dentro
de su módulo de prueba para aislar las reglas de sesión; la aplicación nunca lo desactiva por NODE_ENV.
`test:security` ejecuta dieciséis pruebas en total. No se han añadido variables de entorno ni migraciones.

Referencias oficiales: [autorización en NestJS 11](https://docs.nestjs.com/v11/security/authorization)
y [rate limiting](https://docs.nestjs.com/v11/security/rate-limiting).
