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

Ocho pruebas HTTP con PostgreSQL real cubren creación, lectura, edición, errores de datos,
roles, identidad, campos privilegiados, conflictos y solicitudes concurrentes. Las cuentas y tiendas
de prueba se eliminan por sus identidades al terminar; no se modifica el seed ni cuentas reales.
Las consultas públicas se incorporan en la siguiente unidad de esta fase.
