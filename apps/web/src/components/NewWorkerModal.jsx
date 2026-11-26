import { useEffect, useRef, useState } from 'react';
import { workerService } from '../services/workerService';

const generatePassword = () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    return Array.from(crypto.getRandomValues(new Uint8Array(20)), value => alphabet[value % 64]).join('');
};

export const NewWorkerModal = ({ onClose, onCreated }) => {
    const [form, setForm] = useState(() => ({
        full_name: '', identification: '', route_id: '', password: generatePassword(),
    }));
    const [routes, setRoutes] = useState([]);
    const [routePool, setRoutePool] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [visible, setVisible] = useState(false);
    const [error, setError] = useState('');
    const [credentials, setCredentials] = useState(null);
    const [copyMessage, setCopyMessage] = useState('');
    const locked = useRef(false);

    useEffect(() => {
        let active = true;
        workerService.getRoutes()
            .then(response => {
                if (active) {
                    setRoutes(response.data || []);
                    setRoutePool(response.route_pool);
                }
            })
            .catch(() => { if (active) setError('No fue posible cargar las rutas. Cierra y vuelve a abrir el formulario.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    const change = (event) => setForm(previous => ({
        ...previous, [event.target.name]: event.target.value,
    }));

    const save = async (event) => {
        event.preventDefault();
        if (locked.current) return;
        setError('');
        if (form.password.includes(form.identification)) {
            setError('La contraseña no debe incluir la cédula.');
            return;
        }
        const route = routes.find(item => String(item.id) === form.route_id);
        if (!route) { setError('Selecciona una ruta; no se asigna ninguna por defecto.'); return; }
        locked.current = true;
        setSaving(true);
        try {
            // Conservar el tipo real del ID (puede ser numérico o UUID).
            await workerService.create({ ...form, route_id: route.id });
            setCredentials({
                name: form.full_name.trim(), username: form.identification,
                password: form.password, route: route.name,
            });
            setForm({ full_name: '', identification: '', route_id: '', password: '' });
            onCreated();
        } catch (err) {
            setError(err.response?.data?.message ||
                'No se pudo confirmar la creación. Revisa el listado antes de reintentar.');
        } finally {
            locked.current = false;
            setSaving(false);
        }
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(
                `Sistema de Cobro\nUsuario (cédula): ${credentials.username}\nContraseña: ${credentials.password}`
            );
            setCopyMessage('Credenciales copiadas. Compártelas solo con el trabajador y limpia el portapapeles después.');
        } catch {
            setCopyMessage('No fue posible copiar. Selecciona y copia manualmente las credenciales.');
        }
    };

    return (
        <div className="modal-overlay">
            <section className="win-window modal-window workers-modal" role="dialog" aria-modal="true" aria-labelledby="worker-modal-title">
                <div className="win-titlebar">
                    <span id="worker-modal-title">{credentials ? 'Cuenta creada' : 'Añadir trabajador'}</span>
                    <div className="win-titlebar-controls">
                        <button type="button" className="win-titlebar-btn" disabled={saving} onClick={onClose} aria-label="Cerrar">✕</button>
                    </div>
                </div>
                <div className="workers-panel-body">
                    {credentials ? (
                        <>
                            <div className="form-section-title">CREDENCIALES DEL TRABAJADOR</div>
                            <h2>{credentials.name}</h2>
                            <p>Ruta: {credentials.route}</p>
                            <div className="workers-credentials">
                                <p><strong>Usuario (cédula):</strong> {credentials.username}</p>
                                <p><strong>Contraseña:</strong> <code>{credentials.password}</code></p>
                            </div>
                            <p>Comparte estas credenciales de forma privada. Al cerrar esta ventana, la contraseña dejará de estar disponible. Solo guardamos su hash.</p>
                            <div className="workers-actions">
                                <button className="btn-retro btn-success" onClick={copy}>Copiar credenciales</button>
                                <button className="btn-retro" onClick={onClose}>Ya las guardé, cerrar</button>
                            </div>
                            <p role="status">{copyMessage}</p>
                        </>
                    ) : (
                        <form onSubmit={save}>
                            <p>El trabajador iniciará sesión con su cédula y una contraseña independiente. No requiere correo electrónico.</p>
                            {error && <div className="alert-retro alert-danger mb-3" role="alert">{error}</div>}
                            <fieldset disabled={saving || loading} className="workers-fields">
                                <div className="form-section-title workers-field-wide">1. DATOS DEL TRABAJADOR</div>
                                <label>Nombre completo
                                    <input className="input-retro" name="full_name" value={form.full_name} onChange={change} required minLength={2} maxLength={120} autoComplete="name" />
                                </label>
                                <label>Cédula / usuario
                                    <input className="input-retro" name="identification" value={form.identification} onChange={change} required pattern="[0-9]{1,20}" inputMode="numeric" maxLength={20} autoComplete="off" />
                                </label>
                                <div className="form-section-title workers-field-wide">2. RUTA Y ACCESO</div>
                                <label>Ruta asignada
                                    <select className="input-retro" name="route_id" value={form.route_id} onChange={change} required>
                                        <option value="">Seleccionar ruta</option>
                                        {routes.map(route => <option key={route.id} value={String(route.id)}>
                                            {route.name} · {route.worker_count} {Number(route.worker_count) === 1 ? 'trabajador' : 'trabajadores'}
                                        </option>)}
                                    </select>
                                </label>
                                <label>Contraseña (mínimo 12 caracteres)
                                    <input className="input-retro" name="password" type={visible ? 'text' : 'password'} value={form.password} onChange={change} required minLength={12} maxLength={72} autoComplete="new-password" />
                                </label>
                                <div className="workers-actions workers-field-wide">
                                    <button type="button" className="btn-retro btn-sm" onClick={() => setVisible(value => !value)}>{visible ? 'Ocultar contraseña' : 'Ver contraseña'}</button>
                                    <button type="button" className="btn-retro btn-sm" onClick={() => setForm(previous => ({ ...previous, password: generatePassword() }))}>Generar otra</button>
                                </div>
                                {routePool && <p className="workers-field-wide" role="status">
                                    {routePool.capacity} rutas habilitadas · {routePool.occupied_routes} con trabajadores.
                                    {routePool.capacity === 50
                                        ? ' Las rutas 51–100 se habilitarán cuando cada ruta del 1 al 50 tenga al menos un trabajador.'
                                        : ' Se alcanzó el máximo de 100 rutas.'}
                                    {' '}Puedes asignar varios trabajadores a una misma ruta; compartirán sus clientes.
                                </p>}
                                <p className="workers-field-wide">No uses la cédula dentro de la contraseña. La contraseña generada es aleatoria.</p>
                                {!loading && !routes.length && <p className="workers-field-wide" role="status">No hay rutas activas disponibles. Se necesita una ruta antes de crear la cuenta.</p>}
                                <div className="workers-actions workers-field-wide workers-form-footer">
                                    <button type="submit" className="btn-retro btn-success" disabled={!routes.length}>{saving ? 'Creando…' : 'GUARDAR TRABAJADOR'}</button>
                                    <button type="button" className="btn-retro" onClick={onClose}>Cancelar</button>
                                </div>
                            </fieldset>
                            {loading && <p role="status">Cargando rutas…</p>}
                        </form>
                    )}
                </div>
            </section>
        </div>
    );
};
