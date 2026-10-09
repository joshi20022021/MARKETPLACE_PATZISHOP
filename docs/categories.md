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
