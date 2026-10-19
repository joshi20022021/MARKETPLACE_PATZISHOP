# Checkout — fase 13

La etapa prepara entrega y método de pago, y muestra una revisión validada por el servidor.
No crea pedidos, descuenta stock, reserva inventario, guarda direcciones ni ejecuta pagos.
La compra transaccional con subpedidos corresponde a la fase 14. No hay cambios de esquema,
seed ni dependencias en esta etapa.

## API

Ambos endpoints exigen Bearer, sesión vigente, usuario activo y rol CUSTOMER; conservan cuotas
globales y responden Cache-Control: no-store.

| Método | Ruta                       | Entrada                  | Resultado                                         |
| ------ | -------------------------- | ------------------------ | ------------------------------------------------- |
| GET    | `/api/v1/checkout/options` | Ninguna                  | Métodos locales, GT/GTQ y canPlaceOrder=false     |
| POST   | `/api/v1/checkout/preview` | delivery y paymentMethod | 200 con entrega normalizada y carrito recalculado |

paymentMethod admite CASH_ON_DELIVERY o SIMULATED. delivery es un objeto anidado que exige
recipientName (2–120), phone (7–30, teléfono), addressLine (5–500), city y region (2–100).
postalCode admite hasta 20 caracteres alfanuméricos/espacio/guion y deliveryInstructions hasta 1000;
ambos son opcionales con valor vacío predeterminado. countryCode solo admite GT y se predetermina
a GT si se omite. Se recortan espacios externos y se rechazan tipos incorrectos, campos extra y
caracteres de control; indicaciones permiten saltos de línea. Null no sustituye campos opcionales.

El cliente no envía precios, importes, IDs de propietario ni datos de tarjeta. Un cuerpo inválido
devuelve 400 sin reflejar sus valores. Carrito vacío devuelve 409 EMPTY_CART; disponibilidad o
cantidades inválidas devuelven 409 CART_NEEDS_ATTENTION. La identidad procede únicamente del JWT.
SELLER/ADMIN reciben 403, sin sesión 401. OpenAPI documenta DTOs y errores.

La revisión contiene stage=REVIEW_ONLY, canPlaceOrder=false, delivery, cart, payment y shippingTotal=null.
cart reutiliza proyección comercial, grupos por tienda y cálculos Decimal del carrito propio.
payment.amount coincide con cart.total en GTQ, status=PENDING y requiresOnlinePayment=false.
El envío no se ha cotizado: null no significa envío gratuito. Revisar no garantiza un precio ni stock futuro.

## Contrato de pago

PaymentService es una abstracción inyectable con options() y prepare(method, amount).
LocalPaymentService describe contra entrega y simulación, con importes decimales textuales;
no genera intentos externos, identificadores de transacción ni estados PAID. SIMULATED tiene
simulation=true y una advertencia visible de prueba, sin formulario de tarjeta.
Los proveedores reales y la ejecución del pago deben integrarse después del contrato de compra;
una respuesta de preview nunca debe aceptarse como comprobante de pago ni autorización de inventario.

## Frontend y privacidad

Carrito válido permite ir a `/checkout`; carrito vacío o con incidencias ofrece recuperación.
La ruta exige CUSTOMER y login conserva el retorno interno. React Hook Form/Zod validan entrega
y método antes de enviar. El resumen agrupa productos por tienda e informa que no se confirma una compra.

La dirección y revisión solo permanecen en el estado del formulario durante esa visita; no van a
localStorage, query strings ni caché de TanStack Query. La API tampoco las persiste ni registra el cuerpo.
Salir cancela la solicitud y descarta datos locales; cambios de identidad descartan respuestas antiguas.
Editar dirección/método retira la revisión anterior; un cambio del carrito la oculta. La respuesta
actualiza únicamente la caché del carrito, sin datos de entrega. El POST no tiene reintentos automáticos
de red; la renovación autenticada de un 401 conserva la política existente de Axios.

## Comprobaciones

```powershell
npm run test:checkout
npm run test:cart
npm run test:security
npm run test:api
npm run test:database
npm run test:frontend
npm run build:backend
npm run build:frontend
npm run check
```

Once pruebas nuevas de API con PostgreSQL real cubren permisos, contratos, dos tiendas,
normalización, importes actuales, moderación, límites, ausencia de efectos de compra y OpenAPI.
Preparación: [frontend](frontend.md), [carrito](cart.md) y [backend](backend.md).
