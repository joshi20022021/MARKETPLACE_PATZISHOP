# Registro de cambios

Este archivo resume cambios reales; Git conserva el detalle de cada unidad de trabajo.
Los avances se documentan y guardan en commits coherentes durante el desarrollo, sin esperar
al cierre de una fase completa.

## 2026-10-08 — Gestión de negocios

- BusinessesModule con creación, consulta y edición de la única tienda del vendedor.
- Identidad y propiedad desde JWT, estado PENDING fijo y rechazo de campos privilegiados.
- DTOs con edición parcial, validación de slug/contacto y URL de logo/banner anulables.
- Restricciones únicas de propietario y slug con conflictos 409 seguros incluso bajo concurrencia.
- Ocho pruebas con PostgreSQL real correctas; regresión de API/seguridad, typecheck y build correctos.
- Contratos y decisiones en docs/businesses.md; no se cambian dependencias, entorno ni migraciones.
- Consulta pública de tiendas ACTIVE con propietario SELLER activo, lista paginada y detalle por slug.
- Proyección pública sin datos del propietario, búsqueda literal y snapshot coherente de total/resultados.
- Siete pruebas públicas adicionales: quince pruebas de negocios correctas y regresión de seguridad correcta.
- FASE 7 completada; aprobación administrativa y página visual reservadas para las fases 17 y 11.

## 2026-10-08 — RBAC y controles de propiedad

- JwtAuthGuard global: rutas protegidas por defecto y excepciones Public explícitas.
- RolesGuard global y Roles con permisos exactos por método/controller, sin privilegios implícitos de ADMIN.
- SecurityModule con filtros Prisma de propiedad para tiendas, productos, subpedidos, pedidos y direcciones.
- Diez pruebas de seguridad con PostgreSQL real: matriz de roles, aislamiento, datos manipulados y escrituras acotadas.
- Guía de integración para futuros módulos en docs/security.md; no se añaden endpoints comerciales.
- Throttler 6.7.1 con cuotas por IP/handler: API 120/minuto, registro 5, login 10, refresh/logout 30.
- Guard de cuota previo a JWT/roles, 429 consistente con Retry-After y encabezados accesibles por CORS.
- JSON limitado a 32 KiB con errores seguros; salud exenta y storage en memoria por proceso.
- Seis pruebas adicionales de cuotas, bloqueo, IP falsificada, JSON, CORS y OpenAPI: dieciséis de seguridad.
- Regresión completa correcta: catorce pruebas API/entorno, trece auth y diez SQL, más build y typecheck.
- npm ci reproducido, cliente regenerado y dieciséis pruebas de seguridad correctas tras reinstalar.
- Build HTTP en production: 401, 429/Retry-After, 413, salud disponible, Swagger oculto y probes ausentes.
- Fixtures eliminadas; npm run check correcto y npm audit sin vulnerabilidades reportadas.
- FASE 6 completada; siguiente etapa: negocios. Sin migraciones nuevas ni CRUD de fases posteriores.

## 2026-10-07 — Autenticación JWT y sesiones renovables

### Implementación

- AuthModule y UsersModule: registro CUSTOMER/SELLER, login, perfil protegido y logout.
- Contraseñas bcrypt coste 12, validación UTF-8 de hasta 72 bytes, correo normalizado y rechazo de ADMIN.
- Access JWT HS256 con emisor/audiencia y familia; guard Passport verifica usuario y sesión activos en BD.
- Refresh aleatorio HttpOnly con SHA-256 en PostgreSQL, rotación transaccional y revocación por reutilización.
- Bloqueo por familia para serializar refresh/logout; vigencia absoluta y sesiones independientes por login.
- Cookie SameSite=Strict, Secure en producción, protección por encabezado/origen y respuestas no-store.
- Secreto JWT generado localmente sin imprimirlo ni sobrescribir uno existente; Swagger actualizado.
- Se reutiliza el modelo de la fase 3 sin modificar migraciones.

### Verificación

- TypeScript estricto y build correctos; trece pruebas auth con PostgreSQL real y catorce de API/entorno.
- Diez pruebas SQL existentes correctas; cookies, JWT, concurrencia, reutilización y logout comprobados.
- Las cuentas de prueba se eliminan al terminar y sus sesiones se borran por cascada.
- Instalación reproducida con npm ci, cliente Prisma regenerado y auth correcto tras reinstalar.
- Build HTTP en production comprobado: cookie Secure, perfil, logout, JWT revocado y Swagger oculto.
- Generador JWT conserva byte por byte un entorno existente; archivos privados y compilados ignorados.
- npm run check correcto y npm audit sin vulnerabilidades reportadas.

### Estado

FASE 5 completada. Guía de contratos y pruebas en docs/auth.md. RBAC y rate limiting corresponden
a la fase 6; recuperación de contraseña, verificación de correo y OAuth siguen pendientes.

## 2026-10-06 — Base API NestJS

### Backend

- NestJS 11.2.7 con Express, módulos de configuración, persistencia y salud.
- Inyección de PrismaService con comprobación de conexión al arrancar y desconexión al cerrar.
- Entorno validado sin mostrar secretos, escucha local y comandos de build, ejecución y watch.
- Endpoints `/api/v1/health` y `/api/v1/health/ready`, con 503 cuando no responde PostgreSQL.
- Swagger UI en `/api/docs` y contrato JSON en `/api/docs-json`; desactivado por defecto en producción.
- CORS explícito, Helmet y ValidationPipe global con rechazo de campos extra.
- Formato de errores consistente, sin stack, mensajes internos ni query strings en errores genéricos.

### Verificación

- Pruebas unitarias de entorno y E2E con Nest Testing/Supertest, compiladas con metadata de TypeScript.
- Trece pruebas nuevas correctas, junto a typecheck, build, lint y formato.
- Arranque del build comprobado en el puerto 3000, consulta SQL real y acceso a Swagger/OpenAPI.
- Producción comprobada con Swagger desactivado; sin BD el proceso termina con código 1 sin revelar secretos.
- Instalación reproducida con npm ci y build correcto después de reinstalar.
- Las diez pruebas de integridad PostgreSQL de la fase 3 siguen pasando.
- Override limitado de js-yaml 5.4.3 para Swagger 11; npm audit sin vulnerabilidades reportadas.

### Estado

FASE 4 completada. Solo hay endpoints de infraestructura; no se añaden todavía autenticación,
RBAC ni operaciones comerciales. La siguiente etapa es FASE 5: JWT y Refresh Token.

## 2026-10-06 — Modelo de datos, Prisma y migración inicial

### Modelo y persistencia

- Diagrama entidad-relación presentado antes de implementar el esquema; 14 modelos y siete enums.
- Prisma ORM, Client y adaptador PostgreSQL fijados en 7.10.0.
- Migración inicial con claves foráneas, índices, unicidad y 19 restricciones CHECK adicionales.
- Claves compuestas para impedir cruces de negocio en ítems de pedido y movimientos de inventario.
- Importes decimales, snapshots de compra, sesiones renovables y protección de referencias históricas.
- Cliente generado excluido de Git, configuración TypeScript estricta y comandos de migraciones.
- Preparación de backend/.env a partir del entorno Docker sin imprimir secretos ni sobrescribirlo.
- Seed repetible de ocho categorías globales; no se crean credenciales ni pedidos ficticios todavía.

### Pruebas y dependencias

- Diez pruebas de integración contra PostgreSQL: subpedidos, snapshots, decimales, aislamiento,
  stock, precios, cantidades, totales, SKU y protección del historial.
- Las fixtures se revierten con rollback; se comprobó que no quedan usuarios, productos,
  pedidos ni movimientos de prueba y que solo existen las ocho categorías del seed.
- Seed ejecutado dos veces sin duplicados; migración aplicada y estado al día.
- Validación del esquema, generación del cliente y typecheck correctos.
- Instalación reproducida con `npm ci`, cliente regenerado y diez pruebas correctas tras reinstalar.
- Comparación Prisma sin diferencias entre el esquema y la BD; lint y formato correctos.
- Overrides limitados para deepmerge-ts y mysql2, dependencias transitivas de la CLI Prisma;
  npm audit sin vulnerabilidades reportadas. Motivos y compatibilidad en docs/prisma.md.

### Estado

FASE 3 completada. La estructura de datos está disponible; no hay endpoints, autenticación,
confirmación transaccional de pedidos ni interfaces comerciales implementadas.
La siguiente etapa prevista es FASE 4: Backend NestJS.

## 2026-10-06 — PostgreSQL local con Docker Compose

### Infraestructura y herramientas

- Imagen oficial PostgreSQL 17.11 Alpine con volumen persistente y healthcheck.
- Credenciales obligatorias desde `.env` local; puerto accesible solo por loopback.
- Generador de contraseña aleatoria que conserva cualquier `.env` existente.
- Comandos npm para iniciar, detener, consultar logs y verificar SQL autenticado por TCP.
- Guía de operación, variables y solución de problemas; README actualizado.

### Comprobación

- Docker Desktop iniciado con motor Linux; Compose validado sin imprimir credenciales.
- PostgreSQL saludable y consulta SQL autenticada ejecutada correctamente.
- Dato temporal conservado después de `down` y `up`, recreando el contenedor; tabla de prueba eliminada.
- Conexión al puerto publicado en Windows comprobada.
- Contraseña vacía rechazada por Compose y `.env` existente conservado por el generador.
- `npm run check` y exclusión de `.env` en Git comprobados.

### Ajustes del entorno

La descarga inicial se interrumpió y se completó al reintentar. El puerto 5432 está ocupado en
este equipo; se configuró `POSTGRES_PORT=5433` únicamente en el `.env` local, conservando el
servicio existente. La plantilla mantiene 5432 para instalaciones sin ese conflicto.

### Estado

FASE 2 completada. PostgreSQL disponible; aún no hay esquema Prisma, API ni interfaz comercial.
La siguiente etapa prevista es FASE 3: modelo entidad-relación, Prisma y migraciones.

## 2026-10-05 — Configuración inicial y publicación del proyecto

### Configuración y estructura

- Repositorio con workspaces npm independientes para frontend y backend.
- Directorios por responsabilidades y módulos; todavía sin funcionalidades de aplicación.
- TypeScript estricto, ESLint 10 y Prettier con versiones exactas y lockfile.
- Reglas de editor, finales de línea, versión de Node y exclusiones de archivos privados.
- Plantillas de entorno sin secretos y verificador de configuración inicial.

### Documentación

- Arquitectura modular, flujo multi-vendedor, entidades conceptuales y reglas de consistencia.
- Tecnologías seleccionadas y plan de desarrollo de 22 fases.
- README con instalación, comandos y estado real del proyecto bajo el nombre PatziShop.
- Guía de commits frecuentes, revisión de cambios y publicación al repositorio oficial.
- Instrucciones persistentes del repositorio en `AGENTS.md`.

### Comprobación

- `npm ci`: instalación reproducible desde el lockfile.
- `npm run check`: estructura, lint y formato.
- Exclusiones Git comprobadas para `.env`, dependencias, compilados e imágenes locales;
  los archivos `.env.example` pueden versionarse.

### Estado

FASE 1 completada. No se han implementado Docker, PostgreSQL, API ni interfaz comercial.
La siguiente etapa prevista es FASE 2: Docker + PostgreSQL.
