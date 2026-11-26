-- DESTRUCTIVO, SIN RESPALDO por decisión del propietario.
-- Ejecutar UNA VEZ, ANTES de 02_catalogo_rutas.sql, con las aplicaciones detenidas.
-- No elimina tablas, administradores ni sus contraseñas.
-- Sí elimina TODOS los clientes, codeudores, créditos, cuotas, pagos, comprobantes,
-- trabajadores y rutas antiguas. Los route_id de administradores quedan en NULL.
-- Toda la limpieza y su verificación se ejecutan en UN SOLO bloque atómico.
DO $reset$
DECLARE
    -- Cambiar PENDIENTE por BORRAR_CLIENTES_CREDITOS_WORKERS_Y_RUTAS
    -- solo después de comprobar el proyecto seleccionado.
    confirmacion text := 'PENDIENTE';
    admins_antes jsonb;
    usuarios_despues jsonb;
    targets oid[] := ARRAY[
        'public.users'::regclass, 'public.routes'::regclass,
        'public.clients'::regclass, 'public.guarantors'::regclass,
        'public.credits'::regclass, 'public.installments'::regclass,
        'public.payments'::regclass, 'public.receipts'::regclass
    ];
BEGIN
    IF confirmacion IS DISTINCT FROM 'BORRAR_CLIENTES_CREDITOS_WORKERS_Y_RUTAS' THEN
        RAISE EXCEPTION 'Borrado no confirmado: revisa el proyecto y la advertencia del archivo';
    END IF;
    IF to_regprocedure('public.ensure_worker_route_pool()') IS NOT NULL THEN
        RAISE EXCEPTION 'El catálogo nuevo ya está instalado. No se permite repetir este reinicio inicial';
    END IF;
    PERFORM set_config('lock_timeout', '5s', true);
    LOCK TABLE public.users, public.routes, public.clients, public.guarantors,
        public.credits, public.installments, public.payments, public.receipts
        IN ACCESS EXCLUSIVE MODE;
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE role = 'admin' AND is_active IS TRUE) THEN
        RAISE EXCEPTION 'Debe existir al menos un administrador activo';
    END IF;
    IF EXISTS (SELECT 1 FROM public.users WHERE role IS NULL OR role NOT IN ('admin', 'worker')) THEN
        RAISE EXCEPTION 'Hay roles desconocidos: revisar antes de borrar';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE contype = 'f' AND confrelid = ANY(targets)
          AND NOT (conrelid = ANY(targets))
    ) THEN
        RAISE EXCEPTION 'Hay tablas dependientes fuera del alcance autorizado. Revisar relaciones, no usar CASCADE';
    END IF;
    -- Comparación en memoria; no crea tablas temporales ni un respaldo.
    SELECT coalesce(jsonb_object_agg(id::text, to_jsonb(u) - 'route_id' - 'updated_at'), '{}'::jsonb)
    INTO admins_antes FROM public.users u WHERE role = 'admin';

DELETE FROM public.receipts;
DELETE FROM public.payments;
DELETE FROM public.installments;
DELETE FROM public.credits;
DELETE FROM public.clients;
DELETE FROM public.guarantors;
DELETE FROM public.users WHERE role = 'worker';
UPDATE public.users SET route_id = NULL WHERE role = 'admin' AND route_id IS NOT NULL;
DELETE FROM public.routes;

    SELECT coalesce(jsonb_object_agg(id::text, to_jsonb(u) - 'route_id' - 'updated_at'), '{}'::jsonb)
    INTO usuarios_despues FROM public.users u;
    IF usuarios_despues IS DISTINCT FROM admins_antes THEN
        RAISE EXCEPTION 'La verificación de administradores falló; se cancela todo el borrado';
    END IF;
    IF EXISTS (SELECT 1 FROM public.receipts)
       OR EXISTS (SELECT 1 FROM public.payments)
       OR EXISTS (SELECT 1 FROM public.installments)
       OR EXISTS (SELECT 1 FROM public.credits)
       OR EXISTS (SELECT 1 FROM public.clients)
       OR EXISTS (SELECT 1 FROM public.guarantors)
       OR EXISTS (SELECT 1 FROM public.routes)
       OR EXISTS (SELECT 1 FROM public.users WHERE role IS DISTINCT FROM 'admin') THEN
        RAISE EXCEPTION 'Persisten datos que debían eliminarse; se cancela todo';
    END IF;
END $reset$;

SELECT role, count(*) AS cuentas_conservadas FROM public.users GROUP BY role;
