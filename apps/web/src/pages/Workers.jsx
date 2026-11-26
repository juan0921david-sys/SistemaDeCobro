import { useEffect, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { NewWorkerModal } from '../components/NewWorkerModal';
import { ClientInfoModal } from '../components/ClientInfoModal';
import { ClientCreditsModal } from '../components/ClientCreditsModal';
import { workerService } from '../services/workerService';
import '../styles/workers.css';

const Pagination = ({ page, pagination, onChange, disabled }) => (
    <div className="status-bar workers-pagination">
        <button className="btn-retro btn-sm" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>Anterior</button>
        <span>Página {page} · {pagination.total} registros</span>
        <button className="btn-retro btn-sm" disabled={disabled || page * pagination.pageSize >= pagination.total} onClick={() => onChange(page + 1)}>Siguiente</button>
    </div>
);

const WorkerClients = ({ worker, onClose }) => {
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedClient, setSelectedClient] = useState(null);
    const [view, setView] = useState('');
    useEffect(() => {
        let active = true;
        workerService.getClients(worker.id, page)
            .then(response => {
                if (active) { setData(response); setError(''); }
            })
            .catch(err => {
                if (active) setError(err.response?.data?.message || 'No fue posible cargar los clientes.');
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [worker.id, page]);
    const changePage = (value) => { setLoading(true); setPage(value); };
    return (
        <section className="dashboard-table-section workers-panel">
            <div className="dashboard-table-header">Clientes de la ruta · {worker.full_name}</div>
            <div className="dashboard-table-body workers-panel-body">
                <div className="workers-actions">
                    <h2>{worker.routes?.name || 'Sin ruta asignada'}</h2>
                    <button className="btn-retro btn-sm" onClick={onClose}>Cerrar detalle</button>
                </div>
                <p>Los clientes pertenecen a la ruta. Si varios trabajadores comparten ruta, verán los mismos clientes.</p>
                {error && <div className="alert-retro alert-danger mb-3" role="alert">{error}</div>}
                {loading ? <div className="loading-state" role="status">Cargando clientes…</div> : !error && data && (
                    <>
                        <div className="table-container workers-table-scroll">
                            <table className="table-retro">
                                <thead><tr><th>Cédula</th><th>Nombre</th><th>Teléfono</th><th>Estado</th><th>Información</th></tr></thead>
                                <tbody>
                                    {data.data.clients.map(client => (
                                        <tr key={client.id}>
                                            <td>{client.identification}</td><td>{client.full_name}</td><td>{client.phone || '—'}</td>
                                            <td><span className={`badge ${client.is_active ? 'badge-active' : 'badge-gray'}`}>{client.is_active ? 'ACTIVO' : 'INACTIVO'}</span></td>
                                            <td><div className="workers-actions">
                                                <button className="btn-retro btn-sm btn-profile" onClick={() => { setSelectedClient(client); setView('profile'); }}>PERFIL</button>
                                                <button className="btn-retro btn-sm btn-credits" onClick={() => { setSelectedClient(client); setView('credits'); }}>CRÉDITOS Y CUOTAS</button>
                                            </div></td>
                                        </tr>
                                    ))}
                                    {!data.data.clients.length && <tr><td colSpan={5}>No hay clientes en esta página de la ruta.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <Pagination page={page} pagination={data.pagination} onChange={changePage} disabled={loading} />
                    </>
                )}
            </div>
            {view === 'profile' && <ClientInfoModal client={selectedClient} onClose={() => { setView(''); setSelectedClient(null); }} />}
            {view === 'credits' && <ClientCreditsModal client={selectedClient} onClose={() => { setView(''); setSelectedClient(null); }} />}
        </section>
    );
};

export const Workers = () => {
    const [workers, setWorkers] = useState([]);
    const [pagination, setPagination] = useState({ total: 0, pageSize: 20 });
    const [page, setPage] = useState(1);
    const [revision, setRevision] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState(null);
    useEffect(() => {
        let active = true;
        workerService.getAll(page)
            .then(response => {
                if (active) { setWorkers(response.data); setPagination(response.pagination); setError(''); }
            })
            .catch(err => {
                if (active) setError(err.response?.data?.message || 'No fue posible cargar los trabajadores.');
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [page, revision]);
    const refresh = () => { setLoading(true); setRevision(value => value + 1); };
    const changePage = (value) => { setLoading(true); setPage(value); };
    return (
        <div className="dashboard workers-page">
            <Navbar />
            <main className="dashboard-content workers-content">
                <h1 className="dashboard-header">Trabajadores - Gestión de Rutas</h1>
                <section className="dashboard-table-section workers-panel">
                    <div className="dashboard-table-header">
                        <span>Gestión de Trabajadores</span>
                        <button className="btn-retro btn-sm btn-primary" onClick={() => setShowCreate(true)}>NUEVO TRABAJADOR</button>
                    </div>
                    <div className="dashboard-table-body workers-panel-body">
                        <div className="top-toolbar">
                            <span className="workers-summary">Trabajadores registrados: <strong>{pagination.total}</strong></span>
                            <button className="btn-retro" disabled={loading} onClick={refresh}>Actualizar</button>
                        </div>
                        <p>Gestiona las cuentas y consulta los clientes de cada ruta. Los recuentos incluyen clientes activos e inactivos.</p>
                        {error && <div className="alert-retro alert-danger mb-3" role="alert">{error}</div>}
                        {loading ? <div className="loading-state" role="status">Cargando trabajadores…</div> : !error && (
                            <>
                                <div className="table-container workers-table-scroll">
                                    <table className="table-retro">
                                        <thead><tr><th>Nombre</th><th>Cédula / usuario</th><th>Ruta</th><th>Clientes de la ruta</th><th>Estado</th><th>Acciones</th></tr></thead>
                                        <tbody>
                                            {workers.map(worker => (
                                                <tr key={worker.id}>
                                                    <td>{worker.full_name || 'Sin nombre'}</td><td>{worker.identification || 'Sin cédula'}</td>
                                                    <td>{worker.routes?.name || 'Sin ruta'}</td><td>{worker.total_clients}</td>
                                                    <td><span className={`badge ${worker.is_active ? 'badge-active' : 'badge-gray'}`}>{worker.is_active ? 'ACTIVO' : 'INACTIVO'}</span></td>
                                                    <td><button className="btn-retro btn-sm btn-profile" onClick={() => setSelectedWorker(worker)}>VER CLIENTES</button></td>
                                                </tr>
                                            ))}
                                            {!workers.length && <tr><td colSpan={6}>No hay trabajadores en esta página.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                                <Pagination page={page} pagination={pagination} onChange={changePage} disabled={loading} />
                            </>
                        )}
                    </div>
                </section>
                {selectedWorker && <WorkerClients key={selectedWorker.id} worker={selectedWorker} onClose={() => setSelectedWorker(null)} />}
            </main>
            {showCreate && <NewWorkerModal onClose={() => setShowCreate(false)} onCreated={() => { setPage(1); refresh(); }} />}
        </div>
    );
};
