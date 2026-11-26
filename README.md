# Sistema de Cobro

## Publicación

- Guía manual exacta: [docs/despliegue.md](docs/despliegue.md).
- Limpieza autorizada de la misma base y catálogo de rutas:
  [database/README.md](database/README.md).
- Ningún build ni arranque borra datos o ejecuta migraciones automáticamente.

Monorepo npm con tres aplicaciones:

| Carpeta | Aplicación |
| --- | --- |
| `apps/api` | API Express, autenticación propia y acceso privado a Supabase |
| `apps/web` | Administración en React y Vite |
| `apps/mobile` | Aplicación de trabajadores con Expo SDK 58 |

## Requisitos

- Node.js 24 y npm.
- Para iPhone físico: Expo Go compatible con SDK 58.
- Un proyecto Supabase existente con las tablas y relaciones que utiliza la API.

## Instalación

Desde la raíz, ejecutar una sola instalación para los tres workspaces:

```powershell
npm install --include=dev
```

Una vez generado y validado el lockfile, las instalaciones reproducibles usan:

```powershell
npm ci --include=dev
```

No instalar dependencias manualmente en cada carpeta ni ejecutar varias
instalaciones simultáneas. Tener algunas dependencias anidadas en los
workspaces es normal; no se deben borrar selectivamente para deduplicarlas.
Expo Doctor debe comprobar específicamente los duplicados nativos.

## Configuración privada

La API carga `apps/api/.env` al arrancar desde su workspace:

```dotenv
NODE_ENV=development
PORT=5000
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=COMPLETAR_LOCALMENTE
JWT_SECRET=SECRETO_ALEATORIO_DE_AL_MENOS_32_CARACTERES
JWT_EXPIRES_IN=8h
```

La URL es la del proyecto, sin `/rest/v1`. La clave `service_role` es exclusiva
del backend: nunca debe estar en web, móvil, Git ni capturas.
Las claves se obtienen del proyecto Supabase; estos ejemplos no son credenciales.

## Arranque

Desde la raíz, en terminales independientes:

```powershell
npm run dev:api
npm run dev --workspace apps/web -- --port 5173 --strictPort
npm start --workspace apps/mobile -- --clear --go
```

- API: `http://localhost:5000/health`.
- Web: `http://localhost:5173`.
- Móvil: abrir el QR de Expo Go. El celular y el PC deben compartir red.
  Configurar `EXPO_PUBLIC_API_URL=http://IP-DEL-PC:5000/api` en
  `apps/mobile/.env`. `localhost` en el iPhone no apunta al PC.

La web admite `VITE_API_URL` en `apps/web/.env` y, si no se configura, utiliza
`http://localhost:5000/api`. Estas URLs son públicas; no incluir claves privadas
en variables `VITE_` ni `EXPO_PUBLIC_`.

El health check confirma el arranque, no el acceso a Supabase. Validar este
último con el login de una cuenta existente y consultas de solo lectura.

## Comprobaciones sin operaciones financieras

```powershell
npm ls --workspaces --depth=0
npm run build:web
npm run check:mobile
```

Desde `apps/mobile`:

```powershell
npx expo install --check
npx expo-doctor
```

Los errores TLS/ECONNRESET al acceder a Expo o npm deben investigarse como
problemas de conexión, sin desactivar la validación de certificados.

**No ejecutar los tests actuales de API contra la base de negocio:** todavía
contienen intentos de crear usuarios y expectativas anteriores al cierre del
registro público. No pruebes pagos ficticios sobre datos reales.
