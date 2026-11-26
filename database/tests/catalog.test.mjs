import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// La dependencia de prueba se instala FUERA del proyecto, no en producción.
// PGLITE_MODULE debe ser una URL file:// al módulo instalado.
if (!process.env.PGLITE_MODULE) throw new Error('Define PGLITE_MODULE; ver database/README.md. No se usa Supabase.');
const { PGlite } = await import(process.env.PGLITE_MODULE);
const sql = file => readFileSync(new URL(file, import.meta.url), 'utf8');
const reset = sql('../01_limpiar_datos.sql');
const confirmedReset = reset.replace("'PENDIENTE'", "'BORRAR_CLIENTES_CREDITOS_WORKERS_Y_RUTAS'");
const migration = sql('../02_catalogo_rutas.sql');
const count = async (db, table) => Number((await db.query(`SELECT count(*) AS n FROM public.${table}`)).rows[0].n);
const fail = async (db, query) => {
    await assert.rejects(() => db.exec(query));
    await db.exec('ROLLBACK');
};
const database = async () => {
    const db = new PGlite();
    await db.exec(sql('fixture.sql'));
    return db;
};

test('el borrado requiere confirmación y preserva administradores y hashes', async () => {
    const db = await database();
    try {
        await fail(db, reset);
        assert.equal(await count(db, 'users'), 2);
        assert.equal(await count(db, 'payments'), 1);
        await db.exec(confirmedReset);
        const admins = (await db.query('SELECT role, email, password_hash, route_id FROM public.users')).rows;
        assert.deepEqual(admins, [{
            role: 'admin', email: 'admin@local.invalid', password_hash: 'hash-admin-no-modificar', route_id: null,
        }]);
        for (const name of ['routes', 'clients', 'guarantors', 'credits', 'installments', 'payments', 'receipts']) {
            assert.equal(await count(db, name), 0, name);
        }
    } finally { await db.close(); }
});

test('las dependencias ajenas al alcance cancelan todo el borrado', async () => {
    const db = await database();
    try {
        await db.exec('CREATE TABLE public.no_borrar (id integer, worker uuid REFERENCES public.users(id) ON DELETE CASCADE)');
        await fail(db, confirmedReset);
        assert.equal(await count(db, 'users'), 2);
        assert.equal(await count(db, 'credits'), 1);
    } finally { await db.close(); }
});

test('la migración no limpia silenciosamente una base con datos', async () => {
    const db = await database();
    try {
        await fail(db, migration);
        assert.equal(await count(db, 'clients'), 1);
    } finally { await db.close(); }
});

test('50 rutas, ampliación atómica a 100, sin reducción ni acceso público', async () => {
    const db = await database();
    try {
        await db.exec(confirmedReset);
        await db.exec(migration);
        assert.equal(await count(db, 'routes'), 50);
        await fail(db, "INSERT INTO public.users(email,password_hash,role) VALUES('sin-ruta@local.invalid','hash','worker')");
        await fail(db, "INSERT INTO public.users(email,password_hash,role,route_id) VALUES('cerrada@local.invalid','hash','worker',51)");
        await db.exec(`
            INSERT INTO public.users(email,password_hash,role,route_id)
            SELECT 'w'||n||'@local.invalid', 'hash', 'worker', n FROM generate_series(1,49) n;
            INSERT INTO public.users(email,password_hash,role,route_id)
            VALUES ('segundo@local.invalid','hash','worker',1);
            UPDATE public.users SET route_id=50 WHERE role='admin';
        `);
        assert.equal(await count(db, 'routes'), 50);
        const options = (await db.query('SELECT public.worker_route_options() AS data')).rows[0].data;
        assert.equal(options.route_pool.occupied_routes, 49);
        assert.equal(options.routes[0].worker_count, 2);
        assert.equal(options.routes[49].worker_count, 0);
        assert.ok(!JSON.stringify(options).includes('password_hash'));

        // Si falla la ampliación, el trabajador tampoco se guarda.
        await db.exec(`
            CREATE FUNCTION public.fail_expansion() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN IF NEW.id=51 THEN RAISE EXCEPTION 'fallo simulado'; END IF; RETURN NEW; END $$;
            CREATE TRIGGER fail_expansion BEFORE INSERT ON public.routes FOR EACH ROW EXECUTE FUNCTION public.fail_expansion();
        `);
        const insertLast = "INSERT INTO public.users(email,password_hash,role,route_id,is_active) VALUES('ultimo@local.invalid','hash','worker',50,false)";
        await fail(db, insertLast);
        assert.equal(await count(db, 'routes'), 50);
        assert.equal(Number((await db.query("SELECT count(*) AS n FROM public.users WHERE role='worker' AND route_id=50")).rows[0].n), 0);
        await db.exec('DROP TRIGGER fail_expansion ON public.routes; DROP FUNCTION public.fail_expansion()');
        await db.exec(insertLast);
        assert.equal(await count(db, 'routes'), 100);
        await db.exec("DELETE FROM public.users WHERE email='ultimo@local.invalid'; SELECT public.ensure_worker_route_pool()");
        assert.equal(await count(db, 'routes'), 100);
        await fail(db, "INSERT INTO public.routes(id,name) VALUES(101,'No permitida')");
        await fail(db, 'UPDATE public.routes SET is_active=false WHERE id=1');
        await db.exec(migration);
        assert.equal(await count(db, 'routes'), 100);
        await fail(db, confirmedReset);
        assert.equal(await count(db, 'routes'), 100);
        await fail(db, 'SET ROLE anon; SELECT public.worker_route_options()');
        await db.exec('RESET ROLE');
        await fail(db, 'SET ROLE authenticated; SELECT * FROM public.users');
        await db.exec('RESET ROLE');
        await db.exec('SET ROLE service_role; SELECT public.worker_route_options(); RESET ROLE');
    } finally { await db.close(); }
});
