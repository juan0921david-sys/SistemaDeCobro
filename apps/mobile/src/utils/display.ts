import axios from 'axios';
import type { Money } from '@/services/creditService';

const moneyFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 2,
});

export const formatMoney = (value: Money | null | undefined) => {
    if (value === null || value === undefined) return '—';
    const amount = Number(value);
    return Number.isFinite(amount) ? moneyFormatter.format(amount) : '—';
};

// Las fechas de cuotas son días de calendario, no instantes UTC.
export const formatDate = (value: string | null | undefined) => {
    const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : '—';
};

const statusLabels: Record<string, string> = {
    active: 'Activo', paid: 'Pagado', completed: 'Finalizado',
    cancelled: 'Cancelado', overdue: 'En mora',
    pending: 'Pendiente', partial: 'Abono registrado',
};
export const statusLabel = (status: string) => statusLabels[status] || status;

export const errorMessage = (error: unknown, fallback: string) => {
    if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) return 'Tu sesión ya no es válida. Sal y vuelve a iniciar sesión.';
        const message: unknown = error.response?.data?.message;
        return typeof message === 'string' ? message :
            !error.response ? 'No fue posible conectar con la API. Revisa la conexión y que el backend esté encendido.' : fallback;
    }
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return error.message;
    }
    return fallback;
};
