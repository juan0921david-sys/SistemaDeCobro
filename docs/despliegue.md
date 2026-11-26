# Despliegue manual: GitHub + Supabase + Render + Vercel + Expo EAS

## Estado y límites

Los archivos están preparados, NO se ha creado un repositorio remoto, borrado
la base, desplegado servicios ni solicitado compilaciones de EAS.

Se reutiliza la MISMA base de Supabase y el propietario decidió no hacer
respaldo. La limpieza elimina todos los datos operativos y las rutas antiguas,
conserva administradores y después crea 50 rutas nuevas. Es irreversible sin una
copia externa que ya exista. También afecta a cualquier versión anterior
conectada al mismo Supabase.

**Uso financiero real pendiente:** el backend actual tiene limitaciones en pagos
de cuotas ya abonadas y no garantiza idempotencia/concurrencia de cobros. Los
límites móviles documentados en `mobile-flujos.md` no arreglan toda la API ni
necesariamente protegen otros clientes. Publicar no equivale a certificar el
sistema para operar con dinero real.

## 1. Base de datos: ejecutar antes de arrancar la nueva API

1. Detener las aplicaciones y TODAS las API antiguas que puedan escribir en esa
   base. Mantenerlas detenidas hasta finalizar la configuración nueva.
2. Abrir Supabase Dashboard y seleccionar el mismo proyecto configurado en
   `apps/api/.env`. No compartir las claves.
3. Abrir SQL Editor → New query.
4. Copiar y ejecutar `database/00_inspeccionar.sql`. Es solo lectura.
5. Revisar las relaciones y triggers. Si aparecen dependencias fuera del alcance
   o triggers con efectos en tablas ajenas, detenerse y revisar.
6. Abrir `database/01_limpiar_datos.sql`. En la variable `confirmacion`, sustituir
   `'PENDIENTE'` por `'BORRAR_CLIENTES_CREDITOS_WORKERS_Y_RUTAS'`.
7. Copiar y ejecutar el archivo 01 COMPLETO, una sola vez. No ejecutar fragmentos.
8. Si hay un error, detenerse: la transacción no debe confirmar nada. Si hace
   falta, ejecutar `ROLLBACK;` antes de corregir y reintentar el archivo completo.
9. Ejecutar `database/02_catalogo_rutas.sql` COMPLETO.
10. Ejecutar las consultas de verificación de `database/README.md`: solo admins,
    cero datos operativos y exactamente 50 rutas nuevas.

No hay contraseña de admin nueva: se conservan las existentes. El script no
imprime hashes. Los administradores quedan sin ruta porque sus rutas anteriores
se eliminan. La migración 02 protege las tablas de acceso directo mediante los
roles públicos de Supabase; el acceso de la aplicación sigue pasando por la API.

## 2. Crear una copia limpia para el repositorio nuevo

No borrar `.git` del proyecto original ni hacer `git clone` para copiar el
trabajo actual: hay cambios sin commit que un clon no incluiría.

En PowerShell, desde la carpeta original:

```powershell
Set-Location "C:\Users\juan0\Desktop\SC"
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\preparar-repositorio.ps1 -Destino "C:\Users\juan0\Desktop\SC-despliegue"
```

`SC-despliegue` debe ser una carpeta NUEVA, fuera de `SC`. El script se niega a
sobrescribirla si existe. Copia los archivos actuales (también sin commit), no
los borrados, dependencias, `.git`, `.env` ni credenciales de firma. Sí conserva
los `.env.example`, documentación y SQL. No modifica el original ni sube nada.
El `ExecutionPolicy Bypass` solo aplica a ese proceso, no cambia la política
permanente del equipo.

1. Entrar a GitHub → New repository.
2. Nombre sugerido: `sistema-cobro-despliegue`.
3. Elegir **Private**.
4. NO crear README, licencia ni `.gitignore` desde GitHub.
5. Crear el repositorio y copiar su URL HTTPS.

En PowerShell:

```powershell
Set-Location "C:\Users\juan0\Desktop\SC-despliegue"
git init
git branch -M main
git add .
git diff --cached --name-only
```

Revisar la lista y el contenido en privado: no debe contener `.env`, contraseñas,
hashes reales, tokens, respaldos SQL ni credenciales de firma. Los SQL de
`database/` son scripts de estructura/limpieza y datos ficticios de prueba, no
un volcado de la base real.

Después:

```powershell
git commit -m "Dejamos listo el sistema para su primer despliegue"
git remote add origin https://github.com/TU_USUARIO/sistema-cobro-despliegue.git
git push -u origin main
```

Sustituir `TU_USUARIO` y el nombre si son distintos. No incrustar tokens en la URL.
Si Git pregunta por identidad, configurar nombre/correo propios y repetir el
commit. Autenticarse con el gestor de credenciales/GitHub, no con tokens en Git.

## 3. Backend en Render

### Crear el servicio

1. Entrar a https://dashboard.render.com y conectar GitHub.
2. Autorizar acceso al repositorio privado nuevo.
3. New → **Web Service** → seleccionar el repositorio.
4. Completar:

| Campo | Valor |
| --- | --- |
| Name | `sistema-cobro-api` o un nombre disponible |
| Branch | `main` |
| Runtime | Node |
| Root Directory | VACÍO: raíz del monorepo |
| Build Command | `npm ci --include=dev` |
| Start Command | `npm start --workspace apps/api` |
| Health Check Path | `/health` |

No seleccionar Docker ni poner `apps/api` como Root Directory. El lockfile
válido está en la raíz. `render.yaml` contiene la misma configuración si más
adelante se prefiere importar un Blueprint; no es necesario para crear el
servicio manualmente.

Elegir una región cercana a Supabase. El plan Free es SOLO para pruebas: duerme
por inactividad y el arranque puede superar el timeout de 15 segundos del móvil.
Para uso estable, elegir un plan de instancia sin suspensión. El YAML usa Free
como ejemplo y no representa una recomendación de producción financiera.

### Variables privadas en Render

En Environment agregar:

| Nombre | Valor |
| --- | --- |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `24.18.0` |
| `SUPABASE_URL` | La URL del MISMO proyecto, sin `/rest/v1` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave privada actual, solo aquí |
| `JWT_SECRET` | Secreto nuevo aleatorio, al menos 32 caracteres |
| `JWT_EXPIRES_IN` | `8h` |
| `TRUST_PROXY_HOPS` | `1` para empezar con Render directo; verificar |
| `CORS_ORIGINS` | URL de producción HTTPS de la web, sin `/` final |

Para generar el secreto en la terminal local:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Copiarlo a Render y guardarlo de forma privada. No enviarlo por chat ni ponerlo
en Git. Al cambiarlo, caducan los tokens antiguos del entorno nuevo, no las
contraseñas de las cuentas. Render proporciona `PORT`: no fijarlo manualmente.
La API escucha en `0.0.0.0`.

Si aún no existe la web, escribir temporalmente
`https://pendiente.invalid` en `CORS_ORIGINS`. Es un dominio reservado que no
habilita ninguna web real; permite arrancar y comprobar `/health`. En el paso 4
se reemplaza OBLIGATORIAMENTE por la URL real. No usar `*`, `http`, rutas,
comodines de Vercel ni una barra final. Se pueden separar varios orígenes
EXACTOS por comas.

`TRUST_PROXY_HOPS` no admite `true`: solo 0–5. Con Render directo se empieza con
1. Verificar en un entorno de prueba mediante logging temporal y privado de
`req.ip` que dos clientes con IP públicas distintas se identifican por separado
y que no se confía en una dirección arbitraria enviada por el cliente. Quitar
el diagnóstico después. Si se agrega Cloudflare u otro proxy, revisar el número
y la topología, no aumentar la confianza indiscriminadamente.

### Publicar y comprobar

1. Pulsar Create Web Service / Deploy.
2. Esperar estado Live y revisar logs.
3. Copiar la URL que Render asignó, por ejemplo
   `https://sistema-cobro-api.onrender.com`.
4. Abrir `https://TU_API_REAL.onrender.com/health`.
5. Confirmar respuesta con `"status":"ok"`.

El health check NO comprueba las credenciales de Supabase. Esto se comprueba con
el login y lecturas autorizadas de la web después.

## 4. Frontend en Vercel

1. Entrar a https://vercel.com y conectar GitHub.
2. Add New → Project → importar el MISMO repositorio.
3. Root Directory: raíz del repositorio, no `apps/web`.
4. Node.js Version: **24.x** en Project Settings si hace falta.
5. Usar:

| Campo | Valor |
| --- | --- |
| Framework Preset | Vite |
| Install Command | `npm ci --include=dev` |
| Build Command | `npm run build:web` |
| Output Directory | `apps/web/dist` |

`vercel.json` ya define comandos, salida y fallback de React Router. No volver
a crear este archivo dentro de `apps/web`.

6. En Environment Variables, añadir para **Production**:

```dotenv
VITE_API_URL=https://TU_API_REAL.onrender.com/api
```

Usar el dominio real de Render y terminar en `/api`, sin barra final. No poner
claves privadas. Si se habilitan Preview deployments, usar una base de pruebas
separada para sus escrituras; no apuntarlos indiscriminadamente a la base limpia.

7. Deploy y esperar el resultado.
8. Copiar la URL estable de Production, no la URL temporal de un commit.
9. En Render → Environment, REEMPLAZAR `CORS_ORIGINS` por esa URL exacta.
10. Guardar y volver a desplegar/reiniciar la API.
11. En la web publicada, entrar con el admin existente.
12. Recargar `/clients` y `/workers`: no debe aparecer un 404.
13. Abrir Nuevo trabajador: deben verse rutas 1–50, todas sin trabajadores,
    con la opción vacía “Seleccionar ruta”, nunca una ruta elegida por defecto.

Si `VITE_API_URL` se cambia DESPUÉS de desplegar, volver a compilar/desplegar
la web: Vite incorpora esa variable en el bundle.

Para el proyecto académico se puede evaluar un plan gratuito; para uso comercial,
verificar las condiciones y elegir un plan permitido para esa actividad.

## 5. Primera cuenta de trabajador

Después de la limpieza solo hay admins y estos no entran en el móvil.

1. Web → Trabajadores → Nuevo trabajador.
2. Ingresar nombre y cédula.
3. ELEGIR una ruta explícitamente.
4. Conservar/generar una contraseña segura.
5. Guardar y entregar las credenciales de manera privada.
6. La contraseña solo se muestra durante esa creación; no es recuperable después.

Crear únicamente cuentas reales/autorizadas en esta base, no cincuenta
trabajadores ficticios para probar la ampliación. Las pruebas automáticas ya
comprueban la regla en una base desechable. Cuando cada ruta 1–50 tenga al menos
un trabajador registrado, el selector de una nueva creación mostrará 1–100.
Varias cuentas en una sola ruta no sustituyen cubrir las demás.

## 6. Preparar EAS desde Windows

Desde la raíz de la copia:

```powershell
Set-Location "C:\Users\juan0\Desktop\SC-despliegue"
npm ci --include=dev
npm install --global eas-cli
Set-Location ".\apps\mobile"
eas login
eas whoami
```

Antes de vincular el proyecto, decidir nombre e identificadores en `app.json`.
Los actuales son `com.sistemacobro.mobile` para Android/iOS. Deben estar
disponibles y pertenecer al proyecto/cuenta correctos. Si se cambian, hacerlo
ANTES de la primera distribución. No inventar un `projectId`.

```powershell
eas init
eas build:configure
```

Crear/vincular el proyecto correcto de Expo. `eas.json` YA está preparado:

- `preview`: distribución interna, APK Android / ad hoc iOS.
- `production`: publicación por las tiendas.
- Node 24.18.0 y numeración remota.

No reemplazarlo por una plantilla de development build. Si el asistente propone
modificarlo, conservar estos perfiles. No es necesario `expo-dev-client` para
las versiones independientes descritas aquí.

### URL pública para cada perfil

Ejecutar desde `apps/mobile`, reemplazando el dominio:

```powershell
eas env:set --name EXPO_PUBLIC_API_URL --value https://TU_API_REAL.onrender.com/api --environment preview --visibility plaintext
eas env:set --name EXPO_PUBLIC_API_URL --value https://TU_API_REAL.onrender.com/api --environment production --visibility plaintext
```

Confirmar en el panel Expo → Project → Environment variables que existen en
ambos entornos. No confiar en `.env` local para el build remoto. La URL es
pública; JWT_SECRET y service_role NUNCA deben estar en EAS ni en EXPO_PUBLIC_.

El hook `eas-build-pre-install` comprueba HTTPS, `/api` y que no se use un
placeholder/IP local. La compilación falla con un mensaje claro si falta esa
configuración. No se publica ni sube nada automáticamente desde `npm install`.

EAS modifica `app.json` para vincular el proyecto. Guardar solo configuración:

```powershell
Set-Location "..\.."
git add apps/mobile/app.json apps/mobile/eas.json
git diff --cached --name-only
git commit -m "Vinculamos la aplicacion con Expo para sus compilaciones"
git push
Set-Location ".\apps\mobile"
```

## 7. Descargar e instalar Android

```powershell
eas build --platform android --profile preview
```

1. Si no existe clave de firma, permitir a EAS generar el keystore.
2. Esperar la compilación y abrir su enlace.
3. Abrir el enlace desde Android y descargar el `.apk`.
4. Permitir a ese navegador/gestor instalar desde esa fuente.
5. Instalar y abrir.
6. Iniciar sesión con el trabajador real creado, no con un admin.
7. Probar también con datos móviles.

No necesita Metro, Expo Go, PC encendido ni compartir Wi-Fi. Sí necesita internet
para consultar/registrar en la API. Conservar la misma firma para actualizar.
Un AAB de producción se distribuye por Google Play, no se instala como APK.

## 8. Instalar en iPhone: elegir una ruta

Una exportación de JavaScript no es una app iOS firmada. Los builds ad hoc y
TestFlight de esta guía requieren Apple Developer Program de pago (consultar
precio regional, habitualmente US$99/año). Se pueden solicitar desde Windows:
la compilación y el envío se hacen mediante EAS en la nube.

### A. Instalación interna en dispositivos registrados

```powershell
eas device:create
```

Elegir el equipo Apple correcto, abrir el enlace de registro en Safari del
iPhone y seguir las instrucciones. Registrar el dispositivo no garantiza que
Apple lo habilite inmediatamente si la cuenta es nueva/recién renovada.

```powershell
eas build --platform ios --profile preview
```

Autenticarse con Apple únicamente en el asistente de EAS. Permitir crear los
certificados/perfil y seleccionar el iPhone registrado. Al terminar, abrir en
Safari el enlace de instalación y seguir el flujo. Solo instala en dispositivos
incluidos en el perfil. Agregar otro requiere nueva compilación/refirma. Los
perfiles caducan; no es una distribución permanente e ilimitada.

### B. TestFlight

1. Crear la app en App Store Connect usando el mismo bundle identifier.
2. Ejecutar:

```powershell
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

3. Seleccionar la compilación correcta durante el envío.
4. Esperar procesamiento en App Store Connect → TestFlight.
5. Completar información/compliance solicitada y configurar probadores.
6. Para probadores externos puede requerirse revisión beta de Apple.
7. En el iPhone, instalar TestFlight desde App Store, aceptar la invitación e
   instalar esta aplicación.
8. Entrar con la cuenta del trabajador.

No dar permisos administrativos de App Store Connect a trabajadores solo para
probar. Los builds de TestFlight vencen a los 90 días. Publicación definitiva
en App Store es otro paso y requiere sus datos de privacidad, revisión y demás
requisitos. Sin membresía, Expo Go sigue siendo una opción de DESARROLLO,
no un equivalente de una app independiente instalada con estos métodos.

## 9. Lista final y cambios futuros

- API `/health` responde; login/consultas autorizadas confirman Supabase.
- Web permite entrar al admin y refrescar rutas internas.
- No hay errores de CORS ni se desactivaron los límites de intentos.
- El catálogo empieza con 50 rutas nuevas y el selector no tiene valor elegido.
- La app instalada abre con el PC apagado y funciona por datos móviles.
- Los trabajadores antiguos no pueden acceder; admins conservan credenciales.
- No se escribieron pagos de prueba en la base real.
- Se revisaron las políticas/permisos reales de Supabase; no se considera esto
  una auditoría integral de seguridad o de aptitud financiera.

Para cambios posteriores, hacer commit/push en el repositorio nuevo y desplegar
la revisión correspondiente. Render/Vercel pueden tener autodespliegue; revisar
esa opción antes de subir cambios experimentales. La app nativa necesita una
nueva compilación/distribución para recibir cambios, salvo que se configure
expresamente un sistema de actualizaciones compatible. Cambiar una variable en
Render o EAS no cambia el bundle de una app que ya está instalada.

NUNCA volver a ejecutar el script de limpieza como parte de una actualización.

Referencias oficiales:

- https://render.com/docs/deploy-node-express-app
- https://render.com/docs/free
- https://vercel.com/docs/frameworks/frontend/vite
- https://docs.expo.dev/build/setup/
- https://docs.expo.dev/build-reference/build-with-monorepos/
- https://docs.expo.dev/eas/environment-variables/
- https://docs.expo.dev/build/internal-distribution/
- https://docs.expo.dev/submit/ios/
