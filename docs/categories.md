# Categorías — fase 8

CategoriesModule usa el esquema existente y los guards globales de JWT/roles y cuota. No añade
dependencias, variables de entorno ni migraciones. Las categorías son globales y planas: parentId
queda reservado para subcategorías posteriores y se rechaza en los cuerpos y filtros HTTP actuales.

## Administración

Base: `/api/v1/admin/categories`. Todas las operaciones requieren Bearer JWT de un ADMIN activo
con sesión vigente. CUSTOMER y SELLER reciben 403 ROLE_FORBIDDEN; invitados o sesiones inválidas, 401.
El registro público sigue rechazando ADMIN: no se agregan credenciales ni un atajo para obtener ese rol.

| Método | Ruta                  | Resultado                           |
| ------ | --------------------- | ----------------------------------- |
| POST   | /admin/categories     | 201; crea una categoría             |
| GET    | /admin/categories     | Lista paginada, activas e inactivas |
| GET    | /admin/categories/:id | Detalle administrativo por UUID     |
| PATCH  | /admin/categories/:id | Edita solo los campos enviados      |

POST exige name y slug. name se recorta (2–80 caracteres); slug se recorta y convierte a minúsculas
(3–100, letras ASCII/números con guiones simples entre segmentos). description es texto plano recortado
de hasta 3000 caracteres, vacío si se omite. isActive es un booleano JSON, true si se omite.
PATCH conserva los campos no enviados; description="" vacía el texto e isActive=false desactiva.
No se admite null en ningún campo ni propiedades adicionales; un PATCH vacío devuelve 400 EMPTY_UPDATE.
El slug único incluye categorías inactivas: los conflictos devuelven 409 CATEGORY_SLUG_UNAVAILABLE
y no aplican parcialmente una edición. La restricción de BD arbitra también solicitudes concurrentes.

La respuesta individual contiene id, name, slug, description, isActive, parentId, createdAt y updatedAt.
UUID inválido devuelve 400; UUID inexistente, 404 RESOURCE_NOT_FOUND. No hay eliminación física:
desactivar conserva los productos y sus referencias. No se implementa el CRUD de productos en esta fase.

La lista admite page (1–10000, predeterminado 1), limit (1–50, predeterminado 20), search (máximo 120)
e isActive (solo query literal true/false, opcional). Search busca nombre/descripción sin distinguir
mayúsculas y trata %, _ y barra inversa literalmente. Orden por name ascendente e id ascendente;
conteo y página comparten snapshot RepeatableRead. No se carga todo el catálogo en memoria.
Una página fuera del rango devuelve data vacío manteniendo los totales.

## Verificación

```powershell
npm run db:up
npm run test:categories
```

Las pruebas usan PostgreSQL real y eliminan únicamente sus categorías, productos y usuarios temporales.
Cubren roles/sesiones actuales, validación, lectura, edición, activación, unicidad concurrente,
paginación administrativa y conservación de referencias al desactivar.
`test:categories` ejecuta diecisiete pruebas: nueve administrativas y ocho de consulta pública,
OpenAPI y preservación de datos al repetir el seed.
También se comprobó el build HTTP en production: consulta pública, rechazo de invitados y CUSTOMER
en administración, creación/lectura/desactivación por ADMIN, listas filtradas y Swagger oculto.
La cuenta y categoría temporales se eliminaron, y el proceso se detuvo al terminar.

## Consulta pública

GET `/api/v1/categories` y GET `/api/v1/categories/:slug` admiten invitados. Solo consultan
categorías isActive=true y devuelven id, name, slug y description. Una categoría inactiva y un
slug inexistente reciben el mismo 404 RESOURCE_NOT_FOUND. El detalle usa el slug canónico exacto.
La lista admite page, limit y search con los mismos límites y orden que la lista administrativa;
rechaza isActive, parentId y parámetros adicionales. Los límites globales de 120 solicitudes por
IP/handler en 60 segundos también se aplican a estas rutas y a la administración.

```json
{
  "success": true,
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
}
```

La desactivación o reactivación administrativa se refleja en la siguiente consulta pública;
no borra ni modifica productos. Las reglas de publicación de productos se implementarán en la fase 9.
Cambiar slug cambia la URL de detalle, sin conservar alias.

## Seed

`npm run db:seed` asegura los ocho slugs base mediante upsert, creando solo los que faltan.
Si un slug ya existe, conserva todos sus datos, incluida la desactivación y las ediciones administrativas.
Si se renombra el slug de una categoría base, repetir el seed crea el slug base faltante como otro registro;
para mantenerla oculta, conservar su slug y desactivarla. No se agregan cuentas ADMIN ni contraseñas.
Las pruebas del seed usan slugs temporales; no alteran las ocho categorías reales.

## Prueba manual

Ejecuta `npm run db:seed` y `npm run dev:backend`, y abre `http://127.0.0.1:3000/api/docs`.
GET `/api/v1/categories` puede consultarse sin autenticación. Para las operaciones administrativas
se necesita una cuenta ADMIN provisionada por un operador con acceso a la BD; no existe alta HTTP
de administradores ni una cuenta de demostración en el seed. Inicia sesión según [auth.md](auth.md)
y proporciona el accessToken a Authorize. Las pruebas automatizadas crean y eliminan sus propias
identidades ADMIN para verificar el flujo sin dejar cuentas con privilegios.

```json
{
  "name": "Artesanías",
  "slug": "artesanias",
  "description": "Productos artesanales",
  "isActive": true
}
```

Usa el id devuelto para PATCH con `{ "isActive": false }` y comprueba que el detalle público
por slug responde 404 mientras el detalle administrativo sigue disponible.
