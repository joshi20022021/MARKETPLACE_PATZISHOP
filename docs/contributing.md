# Trabajo por etapas y Git

Cada fase debe explicar su alcance, archivos, decisiones, comandos y verificación.
Resolver los errores antes de continuar; registrar honestamente lo implementado y lo pendiente.

## Conventional Commits

Usar commits pequeños y coherentes:

```text
chore: initialize marketplace repository
docs: document marketplace architecture
feat: add seller product management
fix: prevent seller access to external products
refactor: separate order calculation service
```

Repositorio oficial: [MARKETPLACE_PATZISHOP](https://github.com/joshi20022021/MARKETPLACE_PATZISHOP).
Rama principal `main`; ramas de trabajo como `feat/seller-products` o `fix/order-stock` cuando convenga.
No hace falta introducir Gitflow para este proyecto. Revisar `git diff` antes de cada commit.

## Frecuencia y documentación

Por petición del propietario, guardar cada unidad coherente de trabajo al terminarla y verificarla.
Una fase puede tener varios commits: configuración, regla de negocio, corrección, prueba o documentación.
La cantidad de commits depende de los cambios reales, no del número de fases ni de una cuota.
No crear commits vacíos ni alterar fechas para aparentar actividad.

Los mensajes describen qué cambió; el cuerpo explica el motivo o la validación cuando sea útil.
Actualizar `CHANGELOG.md` con avances relevantes, comprobaciones y limitaciones, y mantener README
y documentación técnica alineados con la implementación. Los cambios pequeños no necesitan
una entrada individual de changelog si quedan cubiertos por una entrada coherente.

Conservar el historial existente del remoto. Subir commits verificados a `origin` sin force push.
Antes de publicar, consultar cambios remotos y resolver cualquier divergencia sin perder trabajo.

## Antes de guardar cambios

```powershell
npm run check
git status --short
git diff --check
```

`check` verifica configuración, lint y formato. Para cambios en backend, ejecutar también
`npm run typecheck`, `npm run build:backend`, `npm run test:api` y las pruebas de datos pertinentes
con `npm run test:database`. Para autenticación ejecutar también `npm run test:auth`;
requiere PostgreSQL, migraciones aplicadas y `npm run auth:env`. Las fases funcionales
agregarán pruebas de sus reglas críticas.

El propietario autorizó publicar el proyecto y guardar los avances mediante commits frecuentes.
Para una unidad de trabajo, seleccionar explícitamente sus archivos y revisar el contenido preparado:

```powershell
git add ruta/al/archivo
git diff --cached --stat
git diff --cached --check
git commit -m "tipo: describe the completed change"
git fetch origin
git status --short --branch
git push origin main
```

No versionar secretos, `.env`, dependencias, compilados ni imágenes temporales.
Si se usa una rama de trabajo, sustituir `main` por su nombre al publicar.
