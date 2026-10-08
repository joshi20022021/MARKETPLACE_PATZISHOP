# Negocios — fase 7

BusinessesModule permite que un SELLER cree, consulte y edite su única tienda. Importa DatabaseModule
y SecurityModule; utiliza JWT, roles y cuotas globales de la fase 6. User y Business ya están en el
esquema inicial: no se necesitan dependencias, variables de entorno ni migraciones nuevas.

## Mi tienda

Base: `/api/v1/seller/business`. Requiere Authorization: Bearer accessToken de un SELLER.
ADMIN y CUSTOMER reciben 403 ROLE_FORBIDDEN; sesión inválida o cuenta inactiva recibe 401.

| Método | Operación                  | Resultado                                      |
| ------ | -------------------------- | ---------------------------------------------- |
| POST   | Crear una tienda           | 201; propietario desde JWT, estado PENDING     |
| GET    | Consultar la propia        | 200; 404 RESOURCE_NOT_FOUND si no tiene tienda |
| PATCH  | Editar los campos enviados | 200; mantiene propietario y estado             |

No se acepta un id en la ruta del vendedor: existe una tienda por cuenta. La consulta y la escritura
se acotan en PostgreSQL por ownerId del usuario autenticado. Los parámetros ownerId/businessId
en query no cambian esa identidad; incluirlos en el cuerpo se rechaza como propiedades extra.
No hay operación DELETE, cambio de propietario ni modificación de estados de moderación.

Campos editables:

| Campo        | Validación                                                                             |
| ------------ | -------------------------------------------------------------------------------------- |
| name         | Texto recortado, 2–120 caracteres                                                      |
| slug         | Recortado y minúsculas, 3–160; letras ASCII, números y guiones simples entre segmentos |
| description  | Texto plano recortado, máximo 3000; al crear se puede omitir y queda vacío             |
| email        | Correo recortado y minúsculas, máximo 254                                              |
| phone        | 7–30 caracteres; números, espacios, paréntesis, guiones y + inicial opcional           |
| address      | Texto recortado, 5–500 caracteres                                                      |
| logo, banner | URL HTTP(S), máximo 2048, sin credenciales; opcionales, null los elimina               |

POST exige name, slug, email, phone y address. PATCH permite omitir campos, conserva los no enviados
y rechaza un cuerpo vacío con 400 EMPTY_UPDATE. Solo logo/banner admiten null. description="" vacía
la descripción. Los textos se tratarán como texto plano en la interfaz, sin renderizarlos como HTML.
Las URL de imágenes se almacenan; la API no descarga archivos ni comprueba su contenido o disponibilidad.
Las cargas y su validación tendrán su implementación posterior.

```json
{
  "name": "Tecnología Patzi",
  "slug": "tecnologia-patzi",
  "description": "Tecnología y accesorios en Patzicía",
  "email": "tienda@example.test",
  "phone": "+502 5555-0000",
  "address": "Zona 1, Patzicía, Chimaltenango"
}
```

La respuesta es la tienda directamente: id, name, slug, description, logo, banner, email, phone,
address, ownerId, status, createdAt y updatedAt. No incluye datos de acceso del propietario.
Las restricciones únicas de PostgreSQL garantizan una tienda por vendedor y un slug globalmente único:
409 BUSINESS_ALREADY_EXISTS o BUSINESS_SLUG_UNAVAILABLE. Un conflicto de edición no aplica parcialmente
otros campos. Los slugs ocupados por tiendas no publicadas tampoco pueden reutilizarse.

La tienda nace PENDING y el vendedor puede editar sus datos en cualquiera de los estados, sin
alterar la moderación. La aprobación o suspensión administrativa corresponde a la fase 17.
Cambiar el slug modificará la futura URL pública; no se mantienen alias o redirecciones históricos.

## Verificación

```powershell
npm run db:up
npm run auth:env
npm run test:businesses
```

Ocho pruebas del vendedor con PostgreSQL real cubren creación, lectura, edición, errores de datos,
roles, identidad, campos privilegiados, conflictos y solicitudes concurrentes. Las cuentas y tiendas
de prueba se eliminan por sus identidades al terminar; no se modifica el seed ni cuentas reales.
Siete pruebas adicionales cubren consultas públicas, visibilidad, proyección de datos,
paginación, búsqueda literal, parámetros inválidos, cambios de slug/estado y OpenAPI.
`test:businesses` ejecuta quince pruebas en total.
También se verificó el proceso compilado en production: registro SELLER, creación, lectura y edición,
ocultación de PENDING, lista y detalle de una fixture ACTIVE, proyección pública y Swagger oculto.
La cuenta y tienda temporales se eliminaron y el proceso se detuvo al terminar.

Para probar manualmente, ejecuta `npm run dev:backend` y abre
`http://127.0.0.1:3000/api/docs`. Registra una cuenta SELLER con el encabezado CSRF indicado
en [auth.md](auth.md), copia el accessToken a Authorize y usa POST/GET/PATCH de Mi tienda.
La tienda creada permanecerá PENDING y no aparecerá en la consulta pública.

## Consulta pública

| Método | Ruta                     | Resultado                                     |
| ------ | ------------------------ | --------------------------------------------- |
| GET    | /api/v1/businesses       | Lista paginada de negocios visibles           |
| GET    | /api/v1/businesses/:slug | Datos de una tienda visible por slug canónico |

Son rutas Public que admiten invitados y mantienen la cuota de 120 solicitudes por IP/handler
en 60 segundos. Una tienda es visible si tiene estado ACTIVE y su propietario está activo y
conserva el rol SELLER. PENDING, SUSPENDED, REJECTED o propietario no elegible quedan ocultos.
Un slug inexistente y uno no publicado reciben el mismo 404 RESOURCE_NOT_FOUND.
El detalle espera el slug exacto en minúsculas; no modifica ni redirige slugs escritos de otra manera.

La lista admite page (1–10000, por defecto 1), limit (1–50, por defecto 12) y search (hasta
120 caracteres recortados). Rechaza valores no enteros, arreglos y parámetros adicionales como
status u ownerId. Search filtra por nombre o descripción sin distinguir mayúsculas; %, _ y
barra inversa se buscan literalmente, sin expandir patrones SQL. El orden es createdAt descendente
con id descendente para desempatar. Paginación offset; no se carga todo el directorio en memoria.

```json
{
  "success": true,
  "data": [],
  "meta": { "page": 1, "limit": 12, "total": 0, "totalPages": 0 }
}
```

Conteo y datos se leen en una transacción RepeatableRead para compartir el mismo snapshot.
Una página posterior a la última devuelve data vacío y conserva total/totalPages. Entre distintas
peticiones, nuevas tiendas o cambios de visibilidad pueden mover los resultados del directorio.
La proyección pública contiene id, name, slug, description, logo, banner, email, phone y address:
son los datos comerciales de contacto. No incluye ownerId, información del usuario ni moderación.
El detalle devuelve esa proyección directamente. Todavía no incluye catálogo de productos.

El seed sigue incluyendo solo ocho categorías. Una tienda recién registrada queda PENDING y no
aparece públicamente. Las pruebas preparan sus propias tiendas ACTIVE directamente en BD para
comprobar visibilidad; la API de aprobación se implementará en la fase 17. No se publica un atajo
para activar tiendas ni credenciales de demostración. La página visual corresponde a la fase 11.
