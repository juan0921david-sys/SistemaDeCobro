import api from './api';

export const workerService = {
    getAll: async (page = 1) => (await api.get('/admin/workers', { params: { page } })).data,
    create: async (data) => (await api.post('/admin/workers', data)).data,
    getClients: async (id, page = 1) =>
        (await api.get(`/admin/workers/${id}/clients`, { params: { page } })).data,
    getRoutes: async () => (await api.get('/admin/workers/routes')).data,
};
