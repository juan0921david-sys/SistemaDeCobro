import api from './api';

export type Money = number | string;

export interface Installment {
    id: string;
    installment_number: number;
    due_date: string;
    amount: Money;
    paid_amount: Money | null;
    status: string;
}

export interface Credit {
    id: string;
    amount: Money;
    total_amount: Money;
    interest_rate: Money;
    payment_frequency: string;
    number_of_installments: number;
    start_date: string;
    end_date: string;
    status: string;
    notes: string | null;
    installments: Installment[] | null;
    guarantors?: { full_name: string; identification: string; phone: string | null; email: string | null } | null;
}

export interface NewCredit {
    client_full_name: string;
    client_identification: string;
    client_phone: string | null;
    client_email: string | null;
    client_address: string | null;
    guarantor_full_name: string | null;
    guarantor_identification: string | null;
    guarantor_phone: string | null;
    guarantor_email: string | null;
    amount: number;
    interest_rate: number;
    number_of_installments: number;
    payment_frequency: string;
    start_date: string;
    notes: string | null;
}

export const createCredit = async (data: NewCredit): Promise<{ credit: Credit & { client_id: string } }> =>
    (await api.post('/credits', data)).data.data;

export const getCreditById = async (id: string, signal?: AbortSignal): Promise<Credit> =>
    (await api.get(`/credits/${encodeURIComponent(id)}`, { signal })).data.data;

export const getClientCredits = async (
    clientId: string,
    signal?: AbortSignal
): Promise<Credit[]> => {
    const response = await api.get(`/credits/client/${encodeURIComponent(clientId)}`, { signal });
    return response.data.data || [];
};
