-- Migración NO destructiva. Aplicar después de 01_limpiar_datos.sql.
-- Catálogo 1–50; se amplía UNA VEZ a 100 al cubrir cada una de las primeras 50.
-- Cuenta trabajadores registrados, incluidos inactivos, no administradores.
-- Una ruta puede tener varios trabajadores. El catálogo nunca se reduce.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
LOCK TABLE public.routes, public.users IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
    IF to_regprocedure('public.ensure_worker_route_pool()') IS NULL AND (
        EXISTS (SELECT 1 FROM public.routes) OR
        EXISTS (SELECT 1 FROM public.users WHERE role <> 'admin') OR
        EXISTS (SELECT 1 FROM public.clients) OR
        EXISTS (SELECT 1 FROM public.credits)
    ) THEN
        RAISE EXCEPTION 'Primero ejecuta la limpieza inicial; esta migración no borra datos';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE role = 'admin' AND is_active IS TRUE) THEN
        RAISE EXCEPTION 'Debe conservarse al menos un administrador activo';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.routes'::regclass AND conname = 'routes_catalog_valid'
    ) THEN
        ALTER TABLE public.routes ADD CONSTRAINT routes_catalog_valid
            CHECK (id BETWEEN 1 AND 100 AND is_active IS TRUE);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS users_worker_route_idx
    ON public.users (route_id) WHERE role = 'worker';

CREATE OR REPLACE FUNCTION public.ensure_worker_route_pool()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    -- La misma cerradura se toma ANTES de escribir trabajadores.
    PERFORM pg_advisory_xact_lock(72431, 50);
    INSERT INTO public.routes (id, name, description, is_active)
    SELECT n, 'Ruta ' || n, 'Catálogo automático de rutas', true
    FROM generate_series(1, 50) n
    ON CONFLICT (id) DO NOTHING;

    IF EXISTS (SELECT 1 FROM public.routes WHERE id > 50)
       OR NOT EXISTS (
           SELECT 1 FROM generate_series(1, 50) n
           WHERE NOT EXISTS (
               SELECT 1 FROM public.users u WHERE u.role = 'worker' AND u.route_id = n
           )
       ) THEN
        INSERT INTO public.routes (id, name, description, is_active)
        SELECT n, 'Ruta ' || n, 'Catálogo automático de rutas', true
        FROM generate_series(51, 100) n
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.validate_worker_route()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.role = 'worker' THEN PERFORM pg_advisory_xact_lock(72431, 50); END IF;
        RETURN OLD;
    END IF;
    IF NEW.role = 'worker' THEN
        PERFORM pg_advisory_xact_lock(72431, 50);
        IF NEW.route_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM public.routes r
            WHERE r.id = NEW.route_id AND r.is_active IS TRUE AND r.id BETWEEN 1 AND 100
        ) THEN
            RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Selecciona una ruta habilitada; no hay ruta por defecto';
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.role = 'worker' THEN PERFORM pg_advisory_xact_lock(72431, 50); END IF;
    END IF;
    RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_worker_route_pool()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.role = 'worker' THEN PERFORM public.ensure_worker_route_pool(); END IF;
    ELSIF NEW.role = 'worker' THEN
        PERFORM public.ensure_worker_route_pool();
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.role = 'worker' THEN PERFORM public.ensure_worker_route_pool(); END IF;
    END IF;
    RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS validate_worker_route_trigger ON public.users;
CREATE TRIGGER validate_worker_route_trigger
BEFORE INSERT OR UPDATE OR DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.validate_worker_route();

DROP TRIGGER IF EXISTS refresh_worker_route_pool_trigger ON public.users;
CREATE TRIGGER refresh_worker_route_pool_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.refresh_worker_route_pool();

CREATE OR REPLACE FUNCTION public.worker_route_options()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    WITH options AS (
        SELECT r.id, r.name, count(u.id) AS worker_count
        FROM public.routes r
        LEFT JOIN public.users u ON u.route_id = r.id AND u.role = 'worker'
        WHERE r.is_active IS TRUE
        GROUP BY r.id, r.name
    )
    SELECT jsonb_build_object(
        'routes', coalesce(jsonb_agg(jsonb_build_object(
            'id', id, 'name', name, 'worker_count', worker_count
        ) ORDER BY id), '[]'::jsonb),
        'route_pool', jsonb_build_object(
            'capacity', count(*),
            'occupied_routes', count(*) FILTER (WHERE worker_count > 0),
            'max_capacity', 100
        )
    ) FROM options;
$$;

REVOKE ALL ON FUNCTION public.ensure_worker_route_pool() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_worker_route() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_worker_route_pool() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.worker_route_options() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_worker_route_pool() TO service_role;
GRANT EXECUTE ON FUNCTION public.worker_route_options() TO service_role;

-- Esta aplicación usa autenticación propia y la API privada con service_role.
-- No necesita acceso de anon/authenticated a sus tablas mediante PostgREST.
REVOKE ALL ON TABLE public.users, public.routes, public.clients, public.guarantors,
    public.credits, public.installments, public.payments, public.receipts
    FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users, public.routes,
    public.clients, public.guarantors, public.credits, public.installments,
    public.payments, public.receipts TO service_role;

SELECT public.ensure_worker_route_pool();
NOTIFY pgrst, 'reload schema';
COMMIT;

SELECT public.worker_route_options();
