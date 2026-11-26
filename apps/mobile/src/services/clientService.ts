import api from './api';

// ============================================
// TIPOS
// ============================================
export interface Client {
    id: string;
    full_name: string;
    identification: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    route_id: string | number | null;
    is_active: boolean;
    created_at: string;
}

// ============================================
// LISTAR CLIENTES (de la ruta del worker)
// ============================================
export const getAllClients = async (signal?: AbortSignal): Promise<Client[]> => {
    const response = await api.get('/clients', { signal });
    if (!Array.isArray(response.data.data)) {
        throw new Error('La API no devolvió un listado de clientes válido.');
    }
    return response.data.data;
};

// ============================================
// BUSCAR CLIENTES
// ============================================
export const searchClients = async (query: string): Promise<Client[]> => {
    try {
        const response = await api.get(`/clients/search?q=${encodeURIComponent(query)}`);
        return response.data.data || [];
    } catch (error: any) {
        console.error('Error buscando clientes:', error);
        throw {
            success: false,
            message: error.response?.data?.message || 'Error al buscar clientes',
        };
    }
};

// ============================================
// OBTENER UN CLIENTE POR ID
// ============================================
export const getClientById = async (id: string, signal?: AbortSignal): Promise<Client> => {
    const response = await api.get(`/clients/${encodeURIComponent(id)}`, { signal });
    return response.data.data;
};

export const updateClient = async (
    id: string,
    data: Pick<Client, 'full_name' | 'phone' | 'email' | 'address'>
): Promise<Client> => (await api.put(`/clients/${encodeURIComponent(id)}`, data)).data.data;
