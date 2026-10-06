# Registro de cambios

Este archivo resume cambios reales; Git conserva el detalle de cada unidad de trabajo.
Los avances se documentan y guardan en commits coherentes durante el desarrollo, sin esperar
al cierre de una fase completa.

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
