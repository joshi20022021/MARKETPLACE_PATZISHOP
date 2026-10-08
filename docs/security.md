# Seguridad y autorización — fase 6

La API protege por defecto las rutas de controllers NestJS. `@Public()` es una excepción explícita:
salud, registro, login, refresh y logout admiten invitados. El perfil sigue exigiendo Bearer JWT.
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

Los módulos de negocio deberán importar SecurityModule y aplicar estos filtros en sus operaciones.
Esta fase añade y comprueba la infraestructura de permisos; no publica CRUD comercial ni reglas
de aprobación de tiendas, transiciones de pedidos o inventario. Corresponden a sus fases.

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

Los límites de solicitudes se incorporan en la siguiente unidad de esta fase.
