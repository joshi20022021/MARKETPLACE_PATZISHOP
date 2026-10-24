# Revisión de validaciones y seguridad — fase 18

Revisión del código y de los contratos implementados en fases 1–17, usando el runner aislado
de fase 19. No cambia esquema, seed ni métodos de pago. No incluye despliegue ni sustituye
una prueba de penetración externa. Los resultados corresponden al estado comprobado el 2026-10-24.

## Correcciones

| Hallazgo comprobado                                               | Resultado                                                                                     |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Auth aceptaba un Origin construido a partir del Host recibido     | Solo se acepta el Origin exacto de CORS_ORIGIN; Host y Forwarded no amplían confianza         |
| No-store dependía de llegar al controller                         | Middleware bajo /api/v1 añade no-store y Pragma incluso a 400/401/403/404/413/415/429         |
| Express aceptaba formularios en escrituras documentadas como JSON | POST/PUT/PATCH con cuerpo requieren application/json; multipart solo en la carga de imágenes  |
| Parser admitía cuerpos comprimidos sin necesitarlos el SPA        | JSON comprimido y charset no soportado devuelven 415, sin descompresión ni detalles internos  |
| Pedidos convertía notación científica, signos y hexadecimales     | page/limit exigen dígitos decimales, límites y rechazo de duplicados, como los demás listados |
| Registro admitía role null y lo convertía a CUSTOMER              | Omitir role mantiene CUSTOMER; null, ADMIN, objetos y valores ajenos se rechazan              |
| Audit encontraba paquetes vulnerables en producción y desarrollo  | Parches compatibles y lockfile actualizado; audit se incorpora a CI                           |

Los rechazos de tipo de cuerpo ocurren en middleware, antes de JWT/DTO, igual que el límite JSON.
No se aceptan formularios URL-encoded, texto plano ni JSON comprimido. Los cuerpos vacíos de
refresh/logout siguen permitidos con la cabecera CSRF. El límite JSON sigue en 32 KiB.
Las imágenes mantienen multipart con un archivo de hasta 5 MiB, seis imágenes y 16 millones de píxeles.

El frontend envía JSON y Origin configurado; las pruebas conservan ese contrato. Swagger sigue
disponible según SWAGGER_ENABLED, pero no se añade su host automáticamente a los orígenes de auth:
obtener el JWT mediante frontend/CLI y usar Bearer en consultas protegidas de Swagger.
Los clientes CLI pueden omitir Origin y deben enviar X-PatziShop-CSRF: 1 en POST de auth.

## Matriz de revisión

| Área             | Evidencia y límite                                                                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Autenticación    | JWT HS256 con emisor/audiencia/expiración y familia activa; rol/actividad releídos de PostgreSQL                                                           |
| Sesiones         | Refresh aleatorio con hash, bloqueo de familia, rotación, detección de reutilización y revocación; cookie HttpOnly/SameSite Strict/Secure en producción    |
| Autorización     | Guards por defecto, roles exactos sin herencia ADMIN y matriz HTTP de todas las operaciones privadas publicadas por AppModule                              |
| Propiedad        | Consultas/escrituras acotadas por usuario/negocio; ajeno e inexistente comparten 404; ninguna identidad o importe del body autoriza acceso                 |
| DTO              | Whitelist estricta, tipos explícitos, anidados, cantidades, importes decimales, UUID, enums, nulabilidad y paginación acotada                              |
| SQL e inventario | Consultas Prisma/tagged SQL parametrizadas; bloqueos estables, rollback y restitución única; se conservan snapshots y separación por tienda                |
| Errores          | Sin stack, cuerpo ni query privada en respuestas/logs de errores; no-store antes de guards y parser; Helmet y CORS explícitos                              |
| Archivos         | Firma/MIME y decodificación Sharp; límites de bytes/píxeles, WebP sin metadatos, UUID opaco y sin ruta suministrada por el cliente                         |
| Media y URLs     | Media pública aplica la misma visibilidad que catálogo; preview requiere propietario. Logos/banner HTTP(S) sin credenciales; Nest no descarga URLs remotas |
| React            | Texto renderizado como texto, sin sinks de HTML arbitrario; token en memoria y refresh HttpOnly, sin tokens/entrega en storage ni URLs                     |
| Caché cliente    | Identidad/epoch, cancelación y descarte tras cambio de sesión, mutaciones inciertas sin reenvío automático                                                 |
| Secretos         | Solo plantillas .env.example en Git; aprovisionamiento ADMIN local sin credenciales seed ni elevación de cuentas existentes                                |
| Recursos         | Rate limiting por IP/handler, límites de cuerpos y uploads; memoria local por proceso, sin pretender protección DDoS distribuida                           |

No se aplicó un filtro global de HTML a datos comerciales: el contenido es texto plano y React
lo escapa al renderizarlo. El servidor no ejecuta URLs ni instrucciones almacenadas en textos.
La revisión no agrega un proveedor de pagos, cobros ni reembolsos.

## Dependencias

- Multer 2.5.0 mediante override limitado a @nestjs/platform-express, que fijaba 2.4.0.
- body-parser 2.4.0 y fast-uri 3.1.9 dentro de sus rangos existentes, fijados en lockfile.
- Vitest 4.1.12 dentro de la línea 4; @testing-library/dom 10.4.2 declarado explícitamente para
  satisfacer el peer requerido de React Testing Library tras una instalación limpia.
- Se conservan Node 22, npm 10, Nest 11, Prisma 7 y los overrides anteriores documentados.

Referencias del registro audit y avisos revisados de los proyectos:
[body-parser](https://github.com/advisories/GHSA-27r3-jxmh-p828),
[Multer](https://github.com/advisories/GHSA-q7qp-rjg7-q26m),
[fast-uri: esquemas](https://github.com/advisories/GHSA-w74x-v6f9-j3xg),
[fast-uri: referencias](https://github.com/advisories/GHSA-333x-w4r6-6crp),
[Vitest: mocks](https://github.com/advisories/GHSA-qxg6-89mg-rqv8) y
[Vitest: rutas Windows](https://github.com/advisories/GHSA-xp26-3454-mjgp).
No se usó audit fix con force ni se bajó de versión principal para ocultar alertas.

## Verificación y límites

```powershell
npm ci
npm run audit:security
npm run test:boundary
npm test
npm run check
npm run typecheck
npm run build:backend
npm run build:frontend
```

Requiere preparar patzishop_test y migraciones según [testing](testing.md).
Nueve pruebas nuevas verifican rutas privadas, origen/Host, cabeceras incluso en errores,
tipos/compresión, límites de cuerpo, nulabilidad y anidados, paginación y ausencia de efectos.
Se reprodujeron seis fallos de las primeras ocho pruebas antes de corregirlos; el aislamiento
de fixtures se conservó tanto en la ejecución fallida como en las correctas.
Instalación limpia con npm ci y auditoría completa correctas, con cero vulnerabilidades reportadas.
La suite completa pasó: 202 backend, 120 frontend y una guarda del runner (323 en total), conservando
los conteos de trece tablas. TypeScript estricto, npm run check y ambos builds correctos.
La validación remota se registrará al cerrar la fase.

Las alertas audit dependen de la base de avisos del registro y deben repetirse. La revisión no
garantiza ausencia de vulnerabilidades desconocidas. Antes de producción quedan las tareas de
las fases 20–22: stack, HTTPS/proxy confiable, secretos y rotación operativa, backup/restauración
de BD/archivos, monitorización y políticas de conservación. Si se añaden réplicas, usar un limiter
compartido. No se debilitaron validación TLS, guards ni controles del sistema para esta revisión.
