import { describe, it, expect, vi, beforeEach } from 'vitest';

const db = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('../src/config/supabase.js', () => ({ default: db }));
import { createWorker, getWorkerRouteOptions } from '../src/controllers/workerController.js';
import { createRoute, updateRoute } from '../src/controllers/routeController.js';

const response = () => {
    const res = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);
    return res;
};
beforeEach(() => vi.clearAllMocks());

describe('catálogo de rutas para trabajadores (DB simulada)', () => {
    it('devuelve opciones ordenadas y metadatos del catálogo privado', async () => {
        const data = { routes: [{ id: 1, name: 'Ruta 1', worker_count: 0 }], route_pool: { capacity: 50 } };
        db.rpc.mockResolvedValue({ data, error: null });
        const res = response();
        await getWorkerRouteOptions({}, res);
        expect(db.rpc).toHaveBeenCalledWith('worker_route_options');
        expect(res.json).toHaveBeenCalledWith({ success: true, data: data.routes, route_pool: data.route_pool });
    });
    it('falla sin inventar rutas cuando falta la migración', async () => {
        db.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202' } });
        const res = response();
        await getWorkerRouteOptions({}, res);
        expect(res.status).toHaveBeenCalledWith(503);
    });
    it.each([undefined, null, '', 0])('no elige una ruta por defecto: %s', route_id => {
        const res = response();
        return createWorker({ body: {
            full_name: 'Trabajador local', identification: '1234',
            password: 'Clave-aleatoria-segura', route_id,
        } }, res).then(() => {
            expect(res.status).toHaveBeenCalledWith(400);
            expect(db.from).not.toHaveBeenCalled();
        });
    });
    it('no permite crear rutas manualmente para saltar el cupo', async () => {
        const res = response();
        await createRoute({ body: { name: 'Ruta 101' } }, res);
        expect(res.status).toHaveBeenCalledWith(409);
        expect(db.from).not.toHaveBeenCalled();
    });
    it('no permite desactivar una ruta del catálogo', async () => {
        const res = response();
        await updateRoute({ params: { id: '1' }, body: { is_active: false } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(db.from).not.toHaveBeenCalled();
    });
});
