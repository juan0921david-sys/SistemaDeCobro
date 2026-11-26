# Preparación de la misma base de Supabase

El propietario autorizó eliminar los datos operativos y las rutas antiguas SIN
respaldo, conservando únicamente las cuentas de administradores. Ningún archivo
de esta carpeta se ejecuta durante el arranque, build o despliegue.

## Orden obligatorio, manual

1. Detener las aplicaciones y las otras instancias de API que escriben en esta
   misma base. Un repositorio nuevo NO aísla la base anterior.
2. Abrir el proyecto correcto en Supabase → SQL Editor.
3. Ejecutar `00_inspeccionar.sql`, de solo lectura. Revisar roles, relaciones y
   triggers; si aparecen tablas ajenas al sistema o triggers que eliminan datos
   de otras tablas, detenerse y revisar el alcance.
4. Abrir `01_limpiar_datos.sql`. Leer la advertencia. En la variable `confirmacion`,
   reemplazar `'PENDIENTE'` por
   `'BORRAR_CLIENTES_CREDITOS_WORKERS_Y_RUTAS'`.
5. Ejecutar TODO el archivo 01 de una vez. Sin confirmación se niega a borrar.
   Borra comprobantes, pagos, cuotas, créditos, clientes, codeudores, trabajadores
   y rutas antiguas, SIN `CASCADE` ni `TRUNCATE`. Los administradores conservan
   IDs, correos, hashes de contraseña y demás datos; solo se limpia `route_id`
   (y puede cambiar `updated_at` si existe un trigger de actualización).
6. Si falla, no ejecutar sentencias sueltas: la transacción cancela el borrado.
   Usar `ROLLBACK;` si el editor indica que la sesión sigue en una transacción
   fallida. Revisar el error antes de continuar.
7. Ejecutar TODO `02_catalogo_rutas.sql`. No borra datos y crea el catálogo.
8. Verificar:

```sql
SELECT role, count(*) FROM public.users GROUP BY role;
SELECT public.worker_route_options();
SELECT count(*) FROM public.clients;
SELECT count(*) FROM public.credits;
SELECT count(*) FROM public.payments;
```

Tras el reinicio deben quedar los administradores, cero datos operativos y 50
rutas NUEVAS (1–50), no las rutas anteriores. El archivo 01 se bloquea si detecta
que ya se instaló el catálogo, para evitar repetir accidentalmente el reinicio.
No ejecutar `database/tests/fixture.sql` en Supabase.

## Regla de las rutas

- El administrador DEBE elegir una ruta; no se asigna la primera automáticamente.
- Se crean `Ruta 1` hasta `Ruta 50`.
- Varios trabajadores pueden compartir una ruta y sus clientes.
- Se cuentan cuentas con `role = 'worker'`, incluidas las inactivas. Los
  administradores no cuentan aunque tengan una ruta.
- Cuando cada ruta de la 1 a la 50 tiene al menos un trabajador registrado, un
  trigger crea las rutas 51–100 en la misma transacción del trabajador.
- Asignar cincuenta trabajadores a una sola ruta NO habilita otro bloque.
- Una vez habilitadas 100, el catálogo no se reduce al quitar trabajadores y no
  crece por encima de 100.
- Se serializan las modificaciones de trabajadores mediante un advisory lock.
  Si falla crear el nuevo bloque, también se cancela crear el trabajador.
- No se permite crear rutas adicionales por `POST /api/routes` ni desactivarlas
  por `PUT /api/routes/:id`. Sí se conserva la edición de nombre/descripción.
- La regla se aplica también a las escrituras por los endpoints de usuarios
  anteriores, no solo al formulario nuevo.
- El RPC del selector solo se concede a `service_role`; la API lo expone
  únicamente al administrador autenticado en `GET /api/admin/workers/routes`.
- Se revoca el acceso de `PUBLIC`, `anon` y `authenticated` a las ocho tablas
  privadas de la aplicación. Se mantiene el acceso privado del backend.

El móvil no permite entrar con cuentas admin. Después del reinicio, crear desde
la web una cuenta de trabajador real, seleccionando su ruta, para usar la app.

## Pruebas sin usar la base real

Las pruebas SQL usan PostgreSQL embebido desechable (PGlite), instalado fuera del
repositorio. No leen `.env` ni se conectan a Supabase:

```powershell
npm install --prefix "$env:LOCALAPPDATA\Temp\opencode\SC-sql-verificacion" --no-save --package-lock=false --ignore-scripts --no-audit --no-fund @electric-sql/pglite
$Modulo = Join-Path $env:LOCALAPPDATA "Temp\opencode\SC-sql-verificacion\node_modules\@electric-sql\pglite\dist\index.js"
$env:PGLITE_MODULE = ([System.Uri]$Modulo).AbsoluteUri
node --test database/tests/catalog.test.mjs
```

Ejecutar desde la raíz. Validan transacciones, conservación de administradores,
restricciones, ampliación, idempotencia y permisos. No sustituyen revisar el
esquema y los triggers reales ni una prueba de concurrencia con conexiones
independientes en un entorno separado.
