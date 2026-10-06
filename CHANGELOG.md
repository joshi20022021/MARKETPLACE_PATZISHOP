# Registro de cambios

Este archivo resume cambios reales; Git conserva el detalle de cada unidad de trabajo.
Los avances se documentan y guardan en commits coherentes durante el desarrollo, sin esperar
al cierre de una fase completa.

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
