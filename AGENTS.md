# Instrucciones del proyecto PatziShop

## Alcance y etapas

- Trabajar en etapas pequeñas y verificables según `docs/roadmap.md`.
- Explicar alcance y archivos antes de implementar una etapa.
- Resolver errores de la etapa actual antes de avanzar. No implementar fases adicionales sin petición.
- Mantener README y documentación fieles al estado real del proyecto.

## Documentación, commits y publicación

El propietario solicitó subir el proyecto a
`https://github.com/joshi20022021/MARKETPLACE_PATZISHOP` y guardar cada unidad coherente de trabajo
con commits frecuentes. Esta preferencia continúa en las siguientes sesiones.

- Usar Conventional Commits con mensajes concretos sobre cambios reales.
- Crear commits al terminar y verificar una unidad de trabajo, sin esperar al final de una fase.
- No generar commits vacíos, cuotas de commits ni fechas artificiales.
- Documentar avances relevantes y comprobaciones en `CHANGELOG.md` y las guías correspondientes.
- Revisar los archivos preparados y evitar incluir cambios ajenos a la tarea.
- Conservar el historial remoto; no usar force push ni reescribir commits publicados.
- Publicar los avances verificados a `origin` y comprobar que quedaron sincronizados.
- Si falta autenticación o hay un bloqueo remoto, conservar los commits locales e informar del bloqueo.

## Verificación y archivos privados

- Ejecutar `npm run check` antes de publicar y las pruebas pertinentes a cambios funcionales.
- Mantener TypeScript estricto y dependencias compatibles con las versiones documentadas.
- No versionar secretos, `.env`, node_modules, compilados ni imágenes temporales.
- Seguir el detalle de `docs/contributing.md`.
