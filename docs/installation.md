# Instalación desde cero

Ejecutar los comandos desde la raíz del repositorio. Requiere Git, Node 22.18+ dentro de la rama 22,
npm 10 y Docker con motor Linux/Compose v2. Las dos opciones siguientes tienen entornos y datos
separados; elegir una antes de crear cuentas. No hay una aplicación pública desplegada todavía.

```powershell
git clone https://github.com/joshi20022021/MARKETPLACE_PATZISHOP.git
Set-Location MARKETPLACE_PATZISHOP
node --version
npm --version
docker version
docker compose version
```

## Aplicación completa en contenedores

No necesita instalar dependencias npm en el host: los scripts de preparación/verificación usan
solo Node y Docker. Los Dockerfiles ejecutan npm ci dentro de Linux.

```powershell
npm run stack:env
npm run stack:up
npm run stack:seed
npm run stack:check
npm run stack:ps
```

Abrir https://localhost:8443. La CA local debe ser confiable para el navegador; `stack:check`
exporta su certificado público a tmp/patzishop-root.crt y verifica HTTPS usando esa CA. La
instalación de confianza en el navegador/sistema es manual. No desactivar la verificación TLS.
La API interna no publica puerto y Swagger está desactivado. Parámetros, certificados y
volúmenes en [Docker](docker.md). `stack:down` detiene el stack conservando datos.

## Desarrollo con recarga

```powershell
npm ci
npm run db:env
npm run db:up
npm run db:backend-env
npm run auth:env
npm run prisma:generate
npm run prisma:deploy
npm run db:seed
npm run prisma:status
npm run check
```

Los generadores conservan archivos existentes. Si 5432 está ocupado, configurar POSTGRES_PORT
en el .env raíz antes de db:up y db:backend-env. No copiar credenciales del stack a desarrollo.
Si backend/.env ya existe, actualizar su conexión deliberadamente: el generador no la reemplaza.
No ejecutar migrate dev ni reset para instalar un checkout: deploy aplica las migraciones revisadas.

Abrir dos terminales en la raíz:

```powershell
# Terminal 1
npm run dev:backend
```

```powershell
# Terminal 2
npm run dev:frontend
```

Frontend: http://localhost:5173. Salud: http://127.0.0.1:3000/api/v1/health/ready.
Swagger: http://127.0.0.1:3000/api/docs; referencia de contratos en [API](api.md).
Mantener localhost en el navegador: el proxy Vite resuelve /api hacia 127.0.0.1:3000 y conserva
el origen configurado para auth. Detener cada servidor con Ctrl+C; `db:down` conserva PostgreSQL.
`build:frontend` genera archivos estáticos. `preview:frontend` los sirve en localhost:4173 y hereda
el proxy configurado; para probar auth, CORS_ORIGIN debe ser http://localhost:4173 antes de arrancar
backend. Preview no es el servidor del stack. Consultar [frontend](frontend.md) antes de usarlo.

## Primer uso

El [seed](seed.md) solo asegura ocho categorías. Registrar CUSTOMER en /registro o SELLER desde
«Quiero vender». Un vendedor crea su tienda, inicialmente PENDING, y prepara productos inactivos.
El propietario aprovisiona una cuenta ADMIN nueva con la utilidad local descrita en
[administración](admin-dashboard.md); no hay credenciales predeterminadas ni registro público ADMIN.
El administrador aprueba la tienda. Solo se publican productos ACTIVE, con stock, categoría y
propietario elegibles. Las capturas de muestra no aparecen al ejecutar el seed.

El cliente puede comprar productos de distintas tiendas; los totales se calculan en el servidor.
Contra entrega registra pago pendiente. SIMULATED no cobra dinero real. La confirmación descuenta
inventario y crea un subpedido por tienda; revisar [pedidos](orders.md) y [gestión](order-management.md).

## Verificación y problemas comunes

```powershell
npm run test:prepare
npm run test:migrate
npm test
npm run typecheck
npm run build:backend
npm run build:frontend
npm run audit:security
npm run check
```

La suite exige PostgreSQL local y backend/.env preparado, pero utiliza patzishop_test, no los datos
de desarrollo. No ejecutar suites simultáneas contra esa base. Alcance y CI en [testing](testing.md).

| Síntoma                            | Comprobación                                                                            |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| Docker no conecta                  | Iniciar Docker Desktop y comprobar el motor Linux con docker version                    |
| Puerto ocupado                     | Revisar POSTGRES_PORT de desarrollo o HTTPS_PORT del stack; no detener servicios ajenos |
| Prisma no encuentra cliente/tablas | Ejecutar prisma:generate y prisma:deploy contra el entorno elegido                      |
| Catálogo vacío                     | El seed no crea productos; comprobar aprobación, categoría, producto y stock            |
| Auth devuelve 403                  | Revisar CORS_ORIGIN y X-PatziShop-CSRF; Host no concede confianza                       |
| Stack no inicia tras migrar        | Consultar stack:logs; corregir el fallo sin eliminar volúmenes                          |
| Certificado no confiable           | Revisar CA local y nombre localhost según la guía Docker                                |
| Error 429                          | Respetar Retry-After; el stack local comparte la IP del proxy                           |
