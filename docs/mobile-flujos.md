# Flujos móviles conectados

## Clientes

- Listado de la ruta: `GET /api/clients`.
- Perfil: `GET /api/clients/:id`.
- Edición de nombre y contacto: `PUT /api/clients/:id`.
- Alta conjunta de cliente, codeudor opcional, crédito y cuotas:
  `POST /api/credits`, con el mismo payload de la web.
- Formulario en cuatro pasos, con revisión y simulación antes de guardar.
  La simulación refleja la fórmula existente, no redefine las condiciones.
  Se limita a 1000 cuotas en la vista previa móvil.

El listado utiliza una sola barra de búsqueda local y un botón compacto de
actualización, sin filtros de estado ni contadores.

## Créditos y cobros

- Consulta por cliente: `GET /api/credits/client/:clientId`.
- Detalle actualizado: `GET /api/credits/:id`.
- Pago de cuota: `POST /api/payments/credit/:creditId/installment/:installmentId`.
- Abono: `POST /api/payments/credit/:creditId/partial`.
- Historial: `GET /api/payments/client/:clientId`.
- PDF autenticado: `GET /api/receipts/payment/:paymentId/download`.

Se registran cobros en efectivo. El selector nativo permite compartir el PDF
o guardarlo en Archivos. La descarga usa Bearer, nunca un token en la URL.
El documento temporal se elimina al finalizar el selector de compartir.

## Límites reales de la API actual

Esta entrega no modifica el backend:

- El pago completo inserta el valor original de la cuota, no su saldo.
  La móvil bloquea esta operación si la cuota ya tiene pagos.
- Los abonos se aplican a la primera cuota con estado `pending`, ignorando
  las cuotas `partial`. Si existe una cuota parcialmente pagada, la móvil
  bloquea nuevos abonos para evitar saltársela.
- No se permiten excedentes: el backend no los distribuye entre cuotas.
- Antes de confirmar un cobro se consulta nuevamente el crédito. Esto NO
  sustituye transacciones, idempotencia ni control de concurrencia en la API.
- Ante timeout o error del servidor después de enviar un alta o cobro, no
  se reenvía automáticamente. Se indica revisar perfil e historial.

Para completar cuotas ya abonadas, admitir excedentes y garantizar cobros
concurrentes, es necesario corregir el backend en una fase expresamente
autorizada. No ocultar estos límites ni probarlos con dinero ficticio en una
base real.

## Comodidad móvil y formato de montos

- Montos y abonos: miles automáticos (`50000` → `50.000`), coma decimal
  y hasta dos centavos. El punto del teclado decimal se convierte en coma;
  al pegar `50.000`, se conserva su significado de cincuenta mil.
- Los porcentajes se interpretan por separado, sin agrupación de miles.
  Los payloads siguen enviando números, nunca textos con separadores.
- Botones compactos con una altura táctil mínima de 44 puntos. Las acciones
  secundarias usan gris; se conserva el relieve retro y el naranja principal.
- Áreas seguras independientes en cada modal, incluidos edición y cobro
  sobre el perfil. El pie del formulario se desplaza con el teclado.
- Los teclados numéricos de iOS incluyen “Listo” para poder ocultarlos.

Pruebas locales sin escribir en la base de datos (desde `apps/mobile`):

```powershell
node --test scripts/money-input.test.mjs
node ../../node_modules/typescript/bin/tsc --noEmit
```

En un iPhone real, comprobar en Expo Go:

1. Abrir perfil, edición y cobro; revisar que “Volver” y “Cerrar” queden
   debajo de la hora/notch, también después de cerrar un modal anidado.
2. Escribir `50000`, borrar hasta vacío, mover el cursor, reemplazar una
   selección y pegar `50.000,50` sin que cambie el importe.
3. Abrir el teclado en monto, fecha y notas; desplazar el formulario y
   comprobar “Listo”, “Atrás” y “Siguiente”, sin guardar operaciones de prueba.
4. Revisar con tamaño de texto grande y pantalla pequeña. El empaquetado
   iOS y las pruebas de lógica no sustituyen estas comprobaciones visuales.
