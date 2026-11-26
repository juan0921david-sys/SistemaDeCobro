import bcrypt from 'bcryptjs';
import supabase from '../config/supabase.js';

const workerFields = 'id, full_name, identification, role, route_id, is_active, created_at, routes:route_id(id, name)';
const pageSize = 20;
const getPage = (value) => {
    const page = Number(value || 1);
    return Number.isSafeInteger(page) && page > 0 ? page : null;
};
const failure = (res, error) => {
    console.error('Error en gestión de trabajadores:', { code: error?.code });
    return res.status(503).json({
        success: false,
        message: 'No fue posible completar la operación. Intenta nuevamente.',
    });
};

export const getWorkerRouteOptions = async (_req, res) => {
    try {
        const { data, error } = await supabase.rpc('worker_route_options');
        if (error) return failure(res, error);
        return res.json({ success: true, data: data.routes, route_pool: data.route_pool });
    } catch (error) {
        return failure(res, error);
    }
};

export const getWorkers = async (req, res) => {
    try {
        const page = getPage(req.query.page);
        if (!page) return res.status(400).json({ success: false, message: 'Página inválida' });

        const { data, error, count } = await supabase.from('users')
            .select(`${workerFields}, route_counts:route_id(clients(count))`, { count: 'exact' })
            .eq('role', 'worker')
            .order('created_at', { ascending: false }).order('id')
            .range((page - 1) * pageSize, page * pageSize - 1);
        if (error) return failure(res, error);

        const workers = data.map(({ route_counts, ...worker }) => ({
            ...worker,
            total_clients: route_counts?.clients?.[0]?.count || 0,
        }));
        return res.json({ success: true, data: workers, pagination: { page, pageSize, total: count } });
    } catch (error) {
        return failure(res, error);
    }
};

export const getWorkerClients = async (req, res) => {
    try {
        const page = getPage(req.query.page);
        if (!page) return res.status(400).json({ success: false, message: 'Página inválida' });
        const { data: worker, error } = await supabase.from('users')
            .select(workerFields).eq('id', req.params.id).eq('role', 'worker').maybeSingle();
        if (error) return failure(res, error);
        if (!worker) return res.status(404).json({ success: false, message: 'Trabajador no encontrado' });
        if (!worker.route_id) {
            return res.json({ success: true, data: { worker, clients: [] }, pagination: { page, pageSize, total: 0 } });
        }
        const result = await supabase.from('clients').select('*', { count: 'exact' })
            .eq('route_id', worker.route_id).order('full_name').order('id')
            .range((page - 1) * pageSize, page * pageSize - 1);
        if (result.error) return failure(res, result.error);
        return res.json({
            success: true,
            data: { worker, clients: result.data },
            pagination: { page, pageSize, total: result.count },
        });
    } catch (error) {
        return failure(res, error);
    }
};

export const createWorker = async (req, res) => {
    try {
        const { full_name, identification, password, route_id } = req.body;
        if (typeof full_name !== 'string' || full_name.trim().length < 2 || full_name.trim().length > 120) {
            return res.status(400).json({ success: false, message: 'Ingresa un nombre de entre 2 y 120 caracteres' });
        }
        if (typeof identification !== 'string' || !/^\d{1,20}$/.test(identification)) {
            return res.status(400).json({ success: false, message: 'La cédula debe contener únicamente números, sin espacios ni puntos' });
        }
        if (
            typeof password !== 'string' || password.length < 12 ||
            Buffer.byteLength(password, 'utf8') > 72 || password.includes(identification)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Usa una contraseña de al menos 12 caracteres, máximo 72 bytes, que no incluya la cédula',
            });
        }
        if (
            !((typeof route_id === 'string' && route_id.trim()) ||
            (typeof route_id === 'number' && Number.isSafeInteger(route_id) && route_id > 0))
        ) {
            return res.status(400).json({ success: false, message: 'Selecciona una ruta activa' });
        }
        const routeResult = await supabase.from('routes').select('id')
            .eq('id', route_id).eq('is_active', true).maybeSingle();
        if (routeResult.error) return failure(res, routeResult.error);
        if (!routeResult.data) {
            return res.status(400).json({ success: false, message: 'La ruta no existe o está desactivada' });
        }
        // Compatibilidad con la columna email existente. No es un correo de contacto:
        // el acceso de estos trabajadores es por cédula.
        const email = `trabajador.${identification}@usuarios.invalid`;
        const existing = await supabase.from('users').select('id')
            .or(`identification.eq.${identification},email.eq.${email}`).limit(1);
        if (existing.error) return failure(res, existing.error);
        if (existing.data.length) {
            return res.status(409).json({ success: false, message: 'Ya existe una cuenta con esta cédula' });
        }
        const password_hash = await bcrypt.hash(password, 12);
        const result = await supabase.from('users').insert([{
            full_name: full_name.trim(), identification, password_hash, email,
            role: 'worker', is_active: true, route_id: routeResult.data.id,
        }]).select(workerFields).single();
        // El trigger valida la ruta y amplía el catálogo en la misma transacción.
        if (result.error?.code === '23514') {
            return res.status(400).json({ success: false, message: 'Selecciona una ruta habilitada del catálogo.' });
        }
        if (result.error?.code === '23505') {
            return res.status(409).json({ success: false, message: 'La cuenta ya existe. Actualiza el listado antes de reintentar.' });
        }
        if (result.error) return failure(res, result.error);
        // Nunca devolver el hash ni volver a transmitir la contraseña.
        return res.status(201).json({ success: true, message: 'Trabajador creado exitosamente', data: result.data });
    } catch (error) {
        return failure(res, error);
    }
};
