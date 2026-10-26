# Seed y datos de muestra

El seed actual ejecuta backend/prisma/seed.ts y seedCategories de backend/prisma/categories.ts.
Hace upsert por slug en una transacción; crea categorías faltantes y deja vacía la actualización
de las existentes. No borra filas ni restaura nombres, descripciones o activaciones editadas.

| Nombre inicial | Slug       |
| -------------- | ---------- |
| Tecnología     | tecnologia |
| Ropa           | ropa       |
| Calzado        | calzado    |
| Hogar          | hogar      |
| Accesorios     | accesorios |
| Belleza        | belleza    |
| Alimentos      | alimentos  |
| Deportes       | deportes   |

## Ejecutar en el entorno elegido

```powershell
# Desarrollo: backend/.env, migraciones aplicadas y cliente generado
npm run db:seed
```

```powershell
# Stack: docker/.env y migraciones del servicio migrate
npm run stack:seed
```

Ambos comandos son explícitos: arrancar la API no ejecuta el seed. Un segundo seed no duplica
un slug existente. Si el administrador renombra un slug base, el siguiente seed crea de nuevo
el slug original como otra categoría; no identifica categorías por nombre ni elimina la renombrada.

No crea usuarios, ADMIN, contraseñas, tiendas, productos, carritos, pedidos ni pagos. Tampoco
aprueba negocios existentes. Las reglas actuales ya permiten dar de alta esos recursos mediante
los flujos de aplicación; no está implementado un seed comercial ampliado.
Crear la primera cuenta administrativa según [administración](admin-dashboard.md).

## Capturas y fixtures

La [galería](screenshots.md) utiliza fixtures ficticias en una base exclusiva y temporal de
documentación. No son datos del seed ni cuentas reutilizables; las credenciales aleatorias no
se publican. Esas fixtures se retiran al terminar la captura. Una instalación nueva tendrá
categorías y pantallas vacías hasta que sus usuarios publiquen productos elegibles.

Las suites crean sus propios datos, verifican aislamiento y los eliminan o revierten al terminar.
No copiar una base de desarrollo para probar. La suite de categorías puede asegurar los ocho
slugs base en patzishop_test; por eso Category no forma parte del conteo global de trece tablas.
Preparación y limpieza en [testing](testing.md); restricciones SQL en [modelo de datos](data-model.md).
